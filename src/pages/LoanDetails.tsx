import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getInternalUserEmailFromSearch, resolveInternalUserId } from '@/lib/internal-user';

type DashboardView = 'overview' | 'profile' | 'loans' | 'transactions' | 'invite' | 'apply';

interface LoanDetailsData {
  loan_id: string;
  app_id: number | null;
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

interface PaymentScheduleItem {
  id: string;
  schedule_id: string | null;
  amount: number;
  date: string;
  is_fully_paid: boolean;
}

interface ProfileName {
  first_name: string;
  last_name: string;
}

const LoanDetails = () => {
  const { loanId, app_id } = useParams<{ loanId: string; app_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [loan, setLoan] = useState<LoanDetailsData | null>(null);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [profile, setProfile] = useState<ProfileName | null>(null);
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);
  const { effectiveUserId: userId } = resolveInternalUserId({
    authenticatedUserId: user?.id,
    search: location.search
  });
  const urlLookupEmail = getInternalUserEmailFromSearch(location.search);
  const xenditPaymentLink = import.meta.env.VITE_XENDIT_PAYMENT_LINK as string | undefined;

  useEffect(() => {
    if (urlLookupEmail) {
      setLookupEmail(urlLookupEmail);
      return;
    }

    setLookupEmail(user?.email ?? null);
  }, [urlLookupEmail, user]);

  // =====================
  // AUTH
  // =====================
  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (!u) navigate('/auth');
        setAuthLoading(false);
      });

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) navigate('/auth');
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // =====================
  // DATA
  // =====================
  useEffect(() => {
    if (!userId || !loanId || !lookupEmail) return;

    const fetchLoanDetails = async () => {
      try {
        setLoading(true);

        const [
          loanRes,
          paymentRes,
          profileRes,
          nextPaymentRes,
          scheduleRes
        ] = await Promise.all([
          supabase
            .from('user_loans_summary')
            .select('loan_id, app_id, loan_amount, interest_rate, term_months, total_balance')
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
            .ilike('email', lookupEmail)
            .maybeSingle(),

          supabase
            .from('outstanding_payment_schedules')
            .select('loan_id, date, remaining_amount')
            .eq('internal_user_id', userId)
            .order('date', { ascending: true })
            .limit(1),

          supabase
            .from('loan_transactions_1')
            .select('id, schedule_id, amount, date, is_fully_paid')
            .eq('loan_id', loanId)
            .eq('type', 'Installment')
            .order('date', { ascending: true })
        ]);

        if (loanRes.error) throw loanRes.error;
        if (paymentRes.error) throw paymentRes.error;
        if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
        if (nextPaymentRes.error) throw nextPaymentRes.error;
        if (scheduleRes.error) throw scheduleRes.error;

        setLoan(loanRes.data);
        setPayments(paymentRes.data ?? []);
        setProfile(profileRes.data ?? null);
        setNextPayment(nextPaymentRes.data?.[0] ?? null);
        setPaymentSchedule(scheduleRes.data ?? []);

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
  }, [loanId, lookupEmail, userId, toast]);

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

  // const openQuickPayPage = (
  //   amount: number,
  //   paymentNumber: number,
  //   totalPayments: number
  // ) => {
  //   const quickPayUrl = new URL('https://wise.com/pay/business/cashewsolutionsopc');
  //   quickPayUrl.searchParams.set('utm_source', 'quick_pay');
  //   quickPayUrl.searchParams.set('amount', String(amount));
  //   quickPayUrl.searchParams.set(
  //     'description',
  //     `${loan.app_id ?? 'Loan'} - Payment ${paymentNumber} of ${totalPayments}`
  //   );

  //   window.open(quickPayUrl.toString(), '_blank', 'noopener,noreferrer');
  // };
  const openQuickPayPage = (
    amount: number,
    paymentNumber: number,
    totalPayments: number
  ) => {
    if (!xenditPaymentLink) {
      toast({
        title: 'Xendit payment link is not configured',
        description: 'Set VITE_XENDIT_PAYMENT_LINK in your environment to enable quick pay.',
        variant: 'destructive'
      });
      return;
    }

    const quickPayUrl = new URL(xenditPaymentLink);
    quickPayUrl.searchParams.set('utm_source', 'quick_pay');
    quickPayUrl.searchParams.set('amount', String(amount));
    quickPayUrl.searchParams.set(
      'description',
      `${loan.app_id ?? 'Loan'} - Payment ${paymentNumber} of ${totalPayments}`
    );

    window.open(quickPayUrl.toString(), '_blank', 'noopener,noreferrer');
  };
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
                <p className="text-muted-foreground">Loan ID: {loan.app_id ?? loan.loan_id}</p>
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

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Payment Schedule</h3>

                {paymentSchedule.length === 0 && (
                  <Card>
                    <CardContent className="py-4 text-sm text-muted-foreground">
                      No scheduled installments yet.
                    </CardContent>
                  </Card>
                )}

                {paymentSchedule.map((schedule, index) => (
                  <Card key={schedule.id}>
                    <CardContent className="py-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {schedule.is_fully_paid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <p className="font-medium">
                            {new Date(schedule.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(schedule.amount)}
                        </p>
                      </div>

                      {schedule.is_fully_paid ? (
                        <Button variant="secondary" disabled>
                          Paid
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            openQuickPayPage(
                              schedule.amount,
                              index + 1,
                              paymentSchedule.length
                            )
                          }
                        >
                          Pay
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </section>
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
