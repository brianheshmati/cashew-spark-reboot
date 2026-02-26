import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react';

interface Loan {
  loan_id: string;
  principal_amount: number | null;
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
  internal_user_id: string;
  promo_code: string | null;
  id: string;
  amount: number | null;
  term: number | null;
  status: string;
  created_at: string;
}

interface LoansViewProps {
  userId: string;
}

export function LoansView({ userId }: LoansViewProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLoansAndApplications();
  }, [userId]);

  const fetchLoansAndApplications = async () => {
    try {
      const { data: loansData, error: loansError } = await supabase
        .from('user_loans_summary')
        .select('*')
        .eq('internal_user_id', userId)
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;

      const { data: applicationsData, error: applicationsError } =
        await supabase
          .from('applications')
          .select('*')
          .eq('internal_user_id', userId)
          .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

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

  // =============================
  // SAFE CURRENCY FORMATTER
  // =============================
  const formatCurrency = (value: number | null | undefined) => {
    const safe = Number(value ?? 0);
    return `₱${safe.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // =============================
  // STATUS HELPERS
  // =============================
  const normalize = (status: string | null | undefined) =>
    (status || '').toLowerCase();

  const isActiveLoan = (loan: Loan) =>
    normalize(loan.status) === 'active';

  const isActiveApplication = (app: Application) =>
    normalize(app.status) !== 'closed';

  const getStatusColor = (status: string) => {
    const s = normalize(status);

    if (s === 'active') return 'bg-success/10 text-success';
    if (s === 'approved') return 'bg-info/10 text-info';
    if (s === 'pending') return 'bg-warning/10 text-warning';
    if (s === 'under_review') return 'bg-info/10 text-info';
    if (s === 'rejected') return 'bg-destructive/10 text-destructive';
    if (s === 'paid_off' || s === 'closed')
      return 'bg-muted text-muted-foreground';

    return 'bg-muted text-muted-foreground';
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Loans</h1>
        <div className="text-center text-muted-foreground">
          Loading loans...
        </div>
      </div>
    );
  }

  const activeLoans = loans.filter(isActiveLoan);

  const totalBalance = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.current_balance ?? 0),
    0
  );

  const totalMonthlyPayment = activeLoans.reduce(
    (sum, loan) => sum + Number(loan.monthly_payment ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">My Loans</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() =>
            navigate('/dashboard', { state: { view: 'apply' } })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Apply for New Loan
        </Button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {activeLoans.length} active loan
              {activeLoans.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Payment
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalMonthlyPayment)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined active payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Applications
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total applications submitted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LOANS */}
      {loans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Loans
          </h2>

          <div className="grid gap-4">
            {loans.map((loan) => {
              const active = isActiveLoan(loan);

              return (
                <Card
                  key={loan.loan_id}
                  className={`transition hover:shadow-md ${
                    active
                      ? 'bg-primary/5 border border-primary/20'
                      : 'bg-card'
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        {loan.loan_type || 'Loan'}
                      </CardTitle>

                      <Badge className={getStatusColor(loan.status)}>
                        {formatStatus(loan.status)}
                      </Badge>
                    </div>

                    <CardDescription>
                      Loan ID: {loan.loan_id.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Current Balance
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(loan.current_balance)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Monthly Payment
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(loan.monthly_payment)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Interest Rate
                        </p>
                        <p className="text-lg font-semibold">
                          {loan.interest_rate ?? 0}%
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Term
                        </p>
                        <p className="text-lg font-semibold">
                          {loan.term_months ?? 0} months
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* APPLICATIONS */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Recent Applications
        </h2>

        {applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map((app) => {
              const active = isActiveApplication(app);

              return (
                <Card
                  key={app.id}
                  className={`transition ${
                    active
                      ? 'bg-warning/10 border border-warning/30'
                      : 'bg-card'
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {app.promo_code ?? 'Standard'} Loan
                        Application
                      </CardTitle>

                      <Badge className={getStatusColor(app.status)}>
                        {formatStatus(app.status)}
                      </Badge>
                    </div>

                    <CardDescription>
                      Applied on{' '}
                      {new Date(app.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Requested Amount
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(app.amount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Application ID
                        </p>
                        <p className="text-sm font-mono">
                          {app.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No loan applications found.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
