import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

type DashboardView = 'overview' | 'profile' | 'loans' | 'transactions' | 'invite' | 'apply';

interface LoanDetailsData {
  loan_id: string;
  loan_amount: number;
  interest_rate: number;
  term_months: number;
  total_balance: number;
}

interface NextPayment {
  loan_id: string;
  date: string;
  remaining_amount: number;
}

interface LoanPayment {
  id: string;
  amount: number;
  date: string;
}

interface ProfileName {
  first_name: string;
  last_name: string;
}

const LoanDetails = () => {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [loan, setLoan] = useState<LoanDetailsData | null>(null);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [profile, setProfile] = useState<ProfileName | null>(null);

  // =====================
  // AUTH
  // =====================
  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_, session) => {
        const u = session?.user ?? null;
        setUser(u);
        setUserId(u?.id ?? null);
        if (!u) navigate('/auth');
        setAuthLoading(false);
      });

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setUserId(u?.id ?? null);
      if (!u) navigate('/auth');
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // =====================
  // DATA
  // =====================
  useEffect(() => {
    if (!userId || !loanId) return;

    const fetchLoanDetails = async () => {
      try {
        setLoading(true);

        const [
          loanRes,
          paymentRes,
          profileRes,
          nextPaymentRes
        ] = await Promise.all([
          supabase
            .from('user_loans_summary')
            .select('loan_id, loan_amount, interest_rate, term_months, total_balance')
            .eq('loan_id', loanId)
            .maybeSingle(),

          supabase
            .from('payments')
            .select('id, amount, date')
            .eq('loan_id', loanId)
            .order('date', { ascending: false })
            .limit(5),

          supabase
            .from('userProfiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .maybeSingle(),

          supabase
            .from('outstanding_payment_schedules')
            .select('loan_id, date, remaining_amount')
            .eq('internal_user_id', userId)
            .order('date', { ascending: true })
            .limit(1)
        ]);

        if (loanRes.error) throw loanRes.error;
        if (paymentRes.error) throw paymentRes.error;
        if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
        if (nextPaymentRes.error) throw nextPaymentRes.error;

        setLoan(loanRes.data);
        setPayments(paymentRes.data ?? []);
        setProfile(profileRes.data ?? null);
        setNextPayment(nextPaymentRes.data?.[0] ?? null);

      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load loan details.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, userId, toast]);

  // =====================
  // DISPLAY NAME
  // =====================
  const displayName = useMemo(() => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
    }
    return user?.email ?? 'Loan Holder';
  }, [profile, user]);

  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [displayName]
  );

  if (authLoading || loading) {
    return <div className="p-10 text-center text-muted-foreground">Loading loan details…</div>;
  }

  if (!loan || !user) return null;

  // =====================
  // RENDER
  // =====================
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          currentView="loans"
          onViewChange={(view: DashboardView) =>
            navigate('/dashboard', { state: { view } })
          }
        />

        <div className="flex-1 flex flex-col">
          <DashboardHeader user={user} onSignOut={() => supabase.auth.signOut()} />

          <main className="flex-1 p-6 bg-gradient-soft">
            <div className="mx-auto max-w-2xl space-y-8">
              <div className="relative flex items-center justify-center">
                <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => navigate(-1)}>
                  <ArrowLeft />
                </Button>
                <h1 className="text-2xl font-semibold">Loan Details</h1>
              </div>

              <div className="text-center space-y-3">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="text-muted-foreground">Loan ID: {loan.loan_id}</p>
              </div>

              <Card>
                <CardContent className="divide-y p-0">
                  <Row label="Loan Amount" value={formatCurrency(loan.loan_amount)} />
                  <Row label="Interest Rate" value={`${loan.interest_rate * 100}%`} />
                  <Row label="Loan Term" value={`${loan.term_months} months`} />
                  <Row
                    label="Next Payment"
                    value={
                      nextPayment
                        ? `${formatCurrency(nextPayment.remaining_amount)} on ${new Date(nextPayment.date).toLocaleDateString()}`
                        : 'None'
                    }
                  />
                  <Row label="Remaining Balance" value={formatCurrency(loan.total_balance)} />
                </CardContent>
              </Card>

              <section className="space-y-3">
                {payments.map((p, i) => (
                  <Card key={p.id}>
                    <CardContent className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-success" />
                        <span>Payment {payments.length - i}</span>
                      </div>
                      <span>{formatCurrency(p.amount)}</span>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <Button className="w-full py-6">Make a Payment</Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between px-6 py-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default LoanDetails;
