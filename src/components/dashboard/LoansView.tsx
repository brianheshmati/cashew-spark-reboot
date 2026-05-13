import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import {
  DollarSign,
  Calendar,
  TrendingUp,
  Plus
} from 'lucide-react';

interface Loan {
  loan_id: string;
  loan_amount: number | null;
  current_balance: number | null;
  interest_rate: number | null;
  term_months: number | null;
  monthly_payment: number | null;
  status: string;
  loan_type: string | null;
  created_at: string;
  email?: string;
}

interface Application {
  id: string;
  app_id: number | null;
  amount: number | null;
  status: string;
  created_at: string;
  loan_purpose: string | null;
  promo_code: string | null;
  email: string;
  remarks: string | null;
}

interface NextPayment {
  loan_id: string;
  amount: number;
  date: string;
  schedule_id: string | null;
}

interface LoansViewProps {
  userEmail?: string;
}

export function LoansView({ userEmail }: LoansViewProps) {

  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPayingNextDue, setIsPayingNextDue] = useState(false);

  const paymentFallbackLink =
    import.meta.env.VITE_PAYMENT_LINK_URL as string | undefined;

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchData();
  }, [userEmail]);

  const fetchData = async () => {

    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {

      const { data: loansData, error: loansError } = await supabase
        .from('user_loans_summary')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;

      const { data: applicationsData, error: appError } = await supabase
        .from('applications_unconverted')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      const loanIds = (loansData || []).map((l) => l.loan_id);

      let nextDueData: any[] = [];

      if (loanIds.length > 0) {

        const { data, error } = await supabase
          .from('loan_transactions_1')
          .select('*')
          .in('loan_id', loanIds)
          .eq('type', 'Installment')
          .eq('is_fully_paid', false)
          .order('date', { ascending: true })
          .limit(1);

        if (error) throw error;

        nextDueData = data || [];
      }

      if (nextDueData.length > 0) {

        setNextPayment({
          loan_id: nextDueData[0].loan_id,
          amount: nextDueData[0].amount,
          date: nextDueData[0].date,
          schedule_id: nextDueData[0].schedule_id
        });

      } else {

        setNextPayment(null);
      }

      setLoans(loansData || []);
      setApplications(applicationsData || []);

    } catch (err) {

      console.error(err);

      toast({
        title: 'Error',
        description: 'Failed to load loans data',
        variant: 'destructive'
      });

    } finally {

      setLoading(false);
    }
  };

  const formatCurrency = (
    value: number | null | undefined
  ) => {

    const safe = Number(value ?? 0);

    return `₱${safe.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const normalize = (
    status: string | null | undefined
  ) => (status || '').toLowerCase();

  const isActiveLoan = (loan: Loan) =>
    normalize(loan.status) === 'active';

  const isActiveApplication = (app: Application) =>
    !['closed', 'duplicate', 'inactive'].includes(
      normalize(app.status)
    );

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const openLoanDetails = (loanId: string) => {

    navigate({
      pathname: `/dashboard/loans/${loanId}`,
      search: location.search
    });
  };

  const openNextPaymentLink = async () => {

    if (!nextPayment || !userEmail) return;

    setIsPayingNextDue(true);

    try {

      const { data, error } =
        await supabase.functions.invoke(
          'create-payment-link',
          {
            body: {
              amount: nextPayment.amount,
              dueDate: nextPayment.date,
              paymentNumber: 1,
              totalPayments: 1,
              loanId: nextPayment.loan_id,
              description: 'My Loans next payment',
              customer: {
                given_names: userEmail.split('@')[0],
                email: userEmail
              }
            }
          }
        );

      if (error) throw error;

      if (!data?.invoice_url) {
        throw new Error(
          'No invoice_url returned from payment provider.'
        );
      }

      window.open(
        data.invoice_url,
        '_blank',
        'noopener,noreferrer'
      );

    } catch (err: any) {

      if (paymentFallbackLink) {

        const fallbackUrl = new URL(paymentFallbackLink);

        fallbackUrl.searchParams.set(
          'utm_source',
          'my_loans_next_payment'
        );

        fallbackUrl.searchParams.set(
          'amount',
          String(nextPayment.amount)
        );

        fallbackUrl.searchParams.set(
          'description',
          `Payment due on ${new Date(
            nextPayment.date
          ).toLocaleDateString()}`
        );

        window.open(
          fallbackUrl.toString(),
          '_blank',
          'noopener,noreferrer'
        );

        return;
      }

      toast({
        title: 'Unable to start payment',
        description:
          err?.message ??
          'Failed to create payment link.',
        variant: 'destructive'
      });

    } finally {

      setIsPayingNextDue(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const activeLoans = loans.filter(isActiveLoan);

  const totalBalance = activeLoans.reduce(
    (sum, loan) =>
      sum + Number(loan.current_balance ?? 0),
    0
  );

  const sortedLoans = [...loans].sort((a, b) => {

    const aActive = isActiveLoan(a) ? 1 : 0;
    const bActive = isActiveLoan(b) ? 1 : 0;

    if (aActive !== bActive) {
      return bActive - aActive;
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });

  const sortedApplications = [...applications].sort(
    (a, b) => {

      const aActive =
        isActiveApplication(a) ? 1 : 0;

      const bActive =
        isActiveApplication(b) ? 1 : 0;

      if (aActive !== bActive) {
        return bActive - aActive;
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    }
  );

  return (

    <div className="space-y-8">

      {/* SUMMARY CARDS */}
      <div className="grid md:grid-cols-3 gap-6">

        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-6 flex justify-between items-center">

            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Active Loans
              </p>

              <p className="text-3xl font-semibold mt-2">
                {activeLoans.length}
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Current active accounts
              </p>
            </div>

            <div className="p-3 rounded-xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>

          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-6 flex justify-between items-center">

            <div>

              <p className="text-xs text-muted-foreground uppercase">
                Outstanding Balance
              </p>

              <p className="text-3xl font-semibold mt-2">
                {formatCurrency(totalBalance)}
              </p>

              {nextPayment ? (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due on{' '}
                    {new Date(
                      nextPayment.date
                    ).toLocaleDateString()}
                  </p>

                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={openNextPaymentLink}
                    disabled={isPayingNextDue}
                  >
                    <Calendar className="h-4 w-4 mr-2" />

                    {isPayingNextDue
                      ? 'Opening…'
                      : 'Pay Now'}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground mt-2">
                  No upcoming payments
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>

          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-6 flex justify-between items-center">

            <div>

              <p className="text-xs text-muted-foreground uppercase">
                Applications
              </p>

              <p className="text-3xl font-semibold mt-2">
                {applications.length}
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Active applications only
              </p>

            </div>

            <div className="p-3 rounded-xl bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>

          </CardContent>
        </Card>
      </div>

      {/* SIDE BY SIDE PANES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* LOANS */}
        <div className="space-y-4">

          <div className="flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Loans
            </h2>

            <Badge variant="secondary">
              {sortedLoans.length}
            </Badge>

          </div>

          {sortedLoans.length === 0 ? (

            <div className="rounded-2xl border p-6 text-sm text-muted-foreground bg-muted/20">
              No loans found.
            </div>

          ) : (

            sortedLoans.map((loan) => {

              const active = isActiveLoan(loan);

              return (

                <div
                  key={loan.loan_id}
                  role={active ? 'button' : undefined}
                  tabIndex={active ? 0 : undefined}
                  onClick={
                    active
                      ? () =>
                          openLoanDetails(
                            loan.loan_id
                          )
                      : undefined
                  }
                  onKeyDown={
                    active
                      ? (event) => {

                          if (
                            event.key === 'Enter' ||
                            event.key === ' '
                          ) {

                            event.preventDefault();

                            openLoanDetails(
                              loan.loan_id
                            );
                          }
                        }
                      : undefined
                  }
                  className={`rounded-2xl p-6 border shadow-sm transition-all ${
                    active
                      ? 'border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40'
                      : 'bg-white'
                  }`}
                >

                  <div className="flex justify-between mb-4 gap-4">

                    <div>

                      <p className="text-lg font-semibold">
                        {loan.loan_type || 'Regular'}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          loan.created_at
                        ).toLocaleDateString()}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        ID:{' '}
                        {loan.loan_id.slice(0, 8)}
                        ...
                      </p>

                    </div>

                    <Badge>
                      {formatStatus(loan.status)}
                    </Badge>

                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">

                    <InfoBlock
                      label="Amount"
                      value={formatCurrency(
                        loan.loan_amount
                      )}
                    />

                    <InfoBlock
                      label="Balance"
                      value={formatCurrency(
                        loan.current_balance
                      )}
                    />

                    <InfoBlock
                      label="Monthly"
                      value={formatCurrency(
                        loan.monthly_payment
                      )}
                    />

                    <InfoBlock
                      label="Rate"
                      value={`${Number(
                        loan.interest_rate ?? 0
                      ) * 100}%`}
                    />

                    <InfoBlock
                      label="Term"
                      value={`${
                        loan.term_months ?? 0
                      } months`}
                    />

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* APPLICATIONS */}
        <div className="space-y-4">

          <div className="flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Applications
            </h2>

            <Badge variant="secondary">
              {sortedApplications.length}
            </Badge>

          </div>

          {sortedApplications.length === 0 ? (

            <div className="rounded-2xl border p-6 text-sm text-muted-foreground bg-muted/20">
              No applications found.
            </div>

          ) : (

            sortedApplications.map((app) => {

              const active =
                isActiveApplication(app);

              return (

                <div
                  key={app.id}
                  className={`rounded-2xl p-6 border shadow-sm ${
                    active
                      ? 'border-green-400 bg-green-50'
                      : 'bg-white'
                  }`}
                >

                  <div className="flex justify-between mb-4 gap-4">

                    <div>

                      <p className="text-lg font-semibold">
                        Application #{app.app_id}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          app.created_at
                        ).toLocaleDateString()}
                      </p>

                    </div>

                    <Badge>
                      {formatStatus(app.status)}
                    </Badge>

                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">

                    <InfoBlock
                      label="Amount"
                      value={formatCurrency(
                        app.amount
                      )}
                    />

                    <InfoBlock
                      label="Purpose"
                      value={
                        app.loan_purpose || '—'
                      }
                    />

                    <InfoBlock
                      label="Promo"
                      value={
                        app.promo_code || '—'
                      }
                    />

                  </div>

                  {app.remarks && (

                    <div className="mt-4 p-4 bg-muted/40 rounded-xl border">

                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        Notes
                      </p>

                      <p className="text-sm">
                        {app.remarks}
                      </p>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value
}: {
  label: string;
  value: string;
}) {

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase">
        {label}
      </p>

      <p className="text-lg font-semibold mt-1">
        {value}
      </p>
    </div>
  );
}