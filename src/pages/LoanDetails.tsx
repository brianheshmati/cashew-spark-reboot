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
  id: string;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  status: string | null;
  loan_type: string;
  origination_date: string | null;
  maturity_date: string | null;
}

interface PaymentSchedule {
  due_date: string;
  amount_due: number;
  status: string | null;
}

interface LoanPayment {
  id: string;
  amount: number;
  payment_date: string;
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
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<LoanDetailsData | null>(null);
  const [nextPayment, setNextPayment] = useState<PaymentSchedule | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [profile, setProfile] = useState<ProfileName | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        navigate('/auth');
      }
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setUser(currentSession?.user ?? null);
      if (!currentSession?.user) {
        navigate('/auth');
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user || !loanId) return;

    const fetchLoanDetails = async () => {
      try {
        setLoading(true);
        const [
          loanResponse,
          scheduleResponse,
          paymentResponse,
          profileResponse
        ] = await Promise.all([
          supabase
            .from('loans')
            .select(
              'id, principal_amount, current_balance, interest_rate, term_months, monthly_payment, status, loan_type, origination_date, maturity_date'
            )
            .eq('id', loanId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('payment_schedules')
            .select('due_date, amount_due, status')
            .eq('loan_id', loanId)
            .neq('status', 'paid')
            .order('due_date', { ascending: true })
            .limit(1),
          supabase
            .from('payments')
            .select('id, amount, payment_date')
            .eq('loan_id', loanId)
            .order('payment_date', { ascending: false })
            .limit(5),
          supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle()
        ]);

        if (loanResponse.error) throw loanResponse.error;
        if (scheduleResponse.error) throw scheduleResponse.error;
        if (paymentResponse.error) throw paymentResponse.error;
        if (profileResponse.error && profileResponse.error.code !== 'PGRST116') {
          throw profileResponse.error;
        }

        setLoan(loanResponse.data ?? null);
        setNextPayment(scheduleResponse.data?.[0] ?? null);
        setPayments(paymentResponse.data ?? []);
        setProfile(profileResponse.data ?? null);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load loan details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, toast, user]);

  const displayName = useMemo(() => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    }
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      return `${user?.user_metadata?.first_name ?? ''} ${user?.user_metadata?.last_name ?? ''}`.trim();
    }
    return user?.email ?? 'Loan Holder';
  }, [profile, user]);

  const initials = useMemo(() => {
    if (!displayName) return 'LH';
    return displayName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar currentView="loans" onViewChange={() => navigate('/dashboard')} />
          <div className="flex-1 flex flex-col">
            {user ? (
              <DashboardHeader user={user} onSignOut={async () => supabase.auth.signOut()} />
            ) : null}
            <main className="flex-1 p-6 bg-gradient-soft">
              <div className="text-center text-muted-foreground">Loading loan details...</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!user || !loan) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          currentView="loans"
          onViewChange={(view: DashboardView) => navigate('/dashboard', { state: { view } })}
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader user={user} onSignOut={async () => supabase.auth.signOut()} />
          <main className="flex-1 p-6 bg-gradient-soft">
            <div className="mx-auto max-w-2xl space-y-8">
              <div className="relative flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-semibold text-foreground">Loan Details</h1>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar className="h-24 w-24 shadow-md">
                  <AvatarFallback className="bg-muted text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{displayName}</h2>
                  <p className="text-muted-foreground">Loan ID: {loan.id}</p>
                </div>
              </div>

              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Loan Summary</h3>
                <Card className="rounded-2xl border-none shadow-sm">
                  <CardContent className="divide-y divide-muted/40 p-0">
                    <div className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="text-muted-foreground">Loan Amount</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(loan.principal_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="text-muted-foreground">Interest Rate</span>
                      <span className="font-semibold text-foreground">{loan.interest_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="text-muted-foreground">Loan Term</span>
                      <span className="font-semibold text-foreground">{loan.term_months} months</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="text-muted-foreground">Next Payment</span>
                      <span className="font-semibold text-foreground">
                        {nextPayment
                          ? `${formatCurrency(nextPayment.amount_due)} on ${new Date(nextPayment.due_date).toLocaleDateString()}`
                          : 'No upcoming payments'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 text-sm">
                      <span className="text-muted-foreground">Remaining Balance</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(loan.current_balance)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
                  <Button
                    variant="link"
                    className="px-0 text-primary"
                    onClick={() => navigate('/dashboard', { state: { view: 'transactions' } })}
                  >
                    View All Payments
                  </Button>
                </div>
                <div className="space-y-3">
                  {payments.length > 0 ? (
                    payments.map((payment, index) => (
                      <Card key={payment.id} className="rounded-2xl">
                        <CardContent className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                Payment {payments.length - index} - {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-success">Paid on time</p>
                            </div>
                          </div>
                          <span className="text-base font-semibold text-foreground">
                            {formatCurrency(payment.amount)}
                          </span>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="rounded-2xl">
                      <CardContent className="px-5 py-6 text-center text-muted-foreground">
                        No payments recorded yet.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>

              <div className="space-y-3 pb-6">
                <Button className="w-full rounded-full py-6 text-base">Make a Payment</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default LoanDetails;
