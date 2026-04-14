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

      // 🔥 LOANS
      const { data: loansData, error: loansError } = await supabase
        .from('user_loans_summary')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;

      // 🔥 APPLICATIONS (VIEW)
      const { data: applicationsData, error: appError } = await supabase
        .from('applications_unconverted')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      // 🔥 NEXT PAYMENT (based on loan_ids)
      const loanIds = (loansData || []).map(l => l.loan_id);

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

  const formatCurrency = (value: number | null | undefined) => {
    const safe = Number(value ?? 0);
    return `₱${safe.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const normalize = (status: string | null | undefined) =>
    (status || '').toLowerCase();

  const isActiveLoan = (loan: Loan) =>
    normalize(loan.status) === 'active';

  const isActiveApplication = (app: Application) =>
    !['closed', 'duplicate', 'inactive'].includes(normalize(app.status));

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const openLoanDetails = (loanId: string) => {
    navigate({
      pathname: `/dashboard/loans/${loanId}`,
      search: location.search
    });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const activeLoans = loans.filter(isActiveLoan);

  const totalBalance = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.current_balance ?? 0),
    0
  );

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-bold">My Loans</h1>
        </div>

        <Button
          className="rounded-xl shadow-sm"
          onClick={() =>
            navigate('/dashboard', { state: { view: 'apply' } })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Apply for New Loan
        </Button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Active Balance
              </p>
              <p className="text-3xl font-semibold mt-2">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Across {activeLoans.length} active loans
              </p>
            </div>

            <div className="p-3 rounded-xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase">
              Next Payment
            </p>

            {nextPayment ? (
              <>
                <p className="text-3xl font-semibold mt-2">
                  {formatCurrency(nextPayment.amount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Due on {new Date(nextPayment.date).toLocaleDateString()}
                </p>

                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() =>
                    navigate('/dashboard', { state: { view: 'transactions' } })
                  }
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground mt-2">
                No upcoming payments
              </p>
            )}
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

      {/* APPLICATIONS */}
      {applications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Applications</h2>

          {applications.map(app => {

            const active = isActiveApplication(app);

            return (
              <div
                key={app.id}
                className={`rounded-2xl p-6 border shadow-sm ${
                  active ? 'border-green-400 bg-green-50' : 'bg-white'
                }`}
              >
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold">
                      Application #{app.app_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Badge>{formatStatus(app.status)}</Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <InfoBlock label="Amount" value={formatCurrency(app.amount)} />
                  <InfoBlock label="Purpose" value={app.loan_purpose || '—'} />
                  <InfoBlock label="Promo" value={app.promo_code || '—'} />
                </div>

                {app.remarks && (
                  <div className="mt-4 p-4 bg-muted/40 rounded-xl border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">
                      Notes
                    </p>
                    <p className="text-sm">{app.remarks}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LOANS */}
      {loans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Loans</h2>

          {loans.map(loan => {

            const active = isActiveLoan(loan);

            return (
              <div
                key={loan.loan_id}
                role={active ? 'button' : undefined}
                tabIndex={active ? 0 : undefined}
                onClick={active ? () => openLoanDetails(loan.loan_id) : undefined}
                onKeyDown={
                  active
                    ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openLoanDetails(loan.loan_id);
                      }
                    }
                    : undefined
                }
                className={`rounded-2xl p-6 border shadow-sm ${
                  active
                    ? 'border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40'
                    : 'bg-white'
                }`}
              >
                <div className="flex justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {loan.loan_type || 'Regular'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {loan.loan_id.slice(0, 8)}...
                    </p>
                  </div>

                  <Badge>{formatStatus(loan.status)}</Badge>
                </div>

                <div className="grid md:grid-cols-5 gap-6">
                  <InfoBlock label="Amount" value={formatCurrency(loan.loan_amount)} />
                  <InfoBlock label="Balance" value={formatCurrency(loan.current_balance)} />
                  <InfoBlock label="Monthly" value={formatCurrency(loan.monthly_payment)} />
                  <InfoBlock label="Rate" value={`${Number(loan.interest_rate ?? 0) * 100}%`} />
                  <InfoBlock label="Term" value={`${loan.term_months ?? 0} months`} />
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
