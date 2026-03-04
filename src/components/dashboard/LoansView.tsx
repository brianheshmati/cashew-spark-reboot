import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  loan_amount: number | null; // ← added
  current_balance: number | null;
  interest_rate: number | null;
  term_months: number | null;
  monthly_payment: number | null;
  status: string;
  loan_type: string | null;
  created_at: string;
  internal_user_id: string;
}

interface Application {
  id: string;
  app_id: number | null;
  amount: number | null;
  status: string;
  created_at: string;
  loan_purpose: string | null;
  promo_code: string | null;
  internal_user_id: string;
}

interface NextPayment {
  loan_id: string;
  amount: number;
  date: string;
  schedule_id: string | null;
}

interface LoansViewProps {
  userId: string;
}

export function LoansView({ userId }: LoansViewProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const { data: loansData } = await supabase
        .from('user_loans_summary')
        .select('*')
        .eq('internal_user_id', userId)
        .order('created_at', { ascending: false });

      const { data: applicationsData } = await supabase
        .from('applications')
        .select('*')
        .eq('internal_user_id', userId)
        .order('created_at', { ascending: false });

      // Pull next unpaid installment (same logic source as TransactionsView)
      const { data: nextDue } = await supabase
        .from('loan_transactions_1')
        .select('*')
        .eq('internal_user_id', userId)
        .eq('type', 'Installment')
        .eq('is_fully_paid', false)
        .order('date', { ascending: true })
        .limit(1);

      if (nextDue && nextDue.length > 0) {
        setNextPayment({
          loan_id: nextDue[0].loan_id,
          amount: nextDue[0].amount,
          date: nextDue[0].date,
          schedule_id: nextDue[0].schedule_id
        });
      } else {
        setNextPayment(null);
      }

      setLoans(loansData || []);
      setApplications(applicationsData || []);
    } catch (err) {
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
    normalize(app.status) !== 'closed';

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Active Balance */}
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

        {/* NEXT PAYMENT CARD */}
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

        {/* Applications */}
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
                Total submitted
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* LOANS SECTION */}
      {loans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Loans</h2>

          {loans.map((loan) => {
            const active = isActiveLoan(loan);

            return (
              <div
                key={loan.loan_id}
                className={`rounded-2xl p-6 border transition shadow-sm ${
                  active
                    ? 'border-primary/40 bg-primary/5'
                    : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {loan.loan_type || 'Regular'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {loan.loan_id.slice(0, 8)}...
                    </p>
                  </div>

                  <Badge>
                    {formatStatus(loan.status)}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-5 gap-6">
                  <InfoBlock
                    label="Loan Amount"
                    value={formatCurrency(loan.loan_amount)}
                  />
                  <InfoBlock
                    label="Current Balance"
                    value={formatCurrency(loan.current_balance)}
                  />
                  <InfoBlock
                    label="Monthly Payment"
                    value={formatCurrency(loan.monthly_payment)}
                  />
                  <InfoBlock
                    label="Interest Rate"
                    value={`${Number(loan.interest_rate ?? 0) * 100}%`}
                  />
                  <InfoBlock
                    label="Term"
                    value={`${loan.term_months ?? 0} months`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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