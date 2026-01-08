import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Loan {
  id: string;
  principal_amount: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  status: string;
  loan_type: string;
  origination_date: string | null;
  maturity_date: string | null;
}

interface Application {
  id: string;
  loan_amount: number;
  loan_type: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
}

export function LoansView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLoansAndApplications();
  }, []);

  const fetchLoansAndApplications = async () => {
    try {
      // Fetch active loans
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;

      // Fetch loan applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      setLoans(loansData || []);
      setApplications(applicationsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load loans data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'approved':
        return 'bg-info/10 text-info';
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'under_review':
        return 'bg-info/10 text-info';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      case 'paid_off':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">My Loans</h1>
        <div className="text-center text-muted-foreground">Loading loans...</div>
      </div>
    );
  }

  const totalBalance = loans.reduce((sum, loan) => sum + loan.current_balance, 0);
  const totalMonthlyPayment = loans.filter(loan => loan.status === 'active')
    .reduce((sum, loan) => sum + loan.monthly_payment, 0);

  console.log('Loans:', loans);
  console.log('Applications:', applications);   

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">My Loans</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Apply for New Loan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Across {loans.length} active loan{loans.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyPayment)}</div>
            <p className="text-xs text-muted-foreground">
              Combined monthly payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">
              Total applications submitted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans */}
      {loans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Active Loans</h2>
          <div className="grid gap-4">
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      {loan.loan_type.charAt(0).toUpperCase() + loan.loan_type.slice(1)} Loan
                    </CardTitle>
                    <Badge className={getStatusColor(loan.status)}>
                      {formatStatus(loan.status)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Loan ID: {loan.id.slice(0, 8)}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-lg font-semibold">{formatCurrency(loan.current_balance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Payment</p>
                      <p className="text-lg font-semibold">{formatCurrency(loan.monthly_payment)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="text-lg font-semibold">{loan.interest_rate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Term</p>
                      <p className="text-lg font-semibold">{loan.term_months} months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Applications</h2>
        {applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {application.loan_type.charAt(0).toUpperCase() + application.loan_type.slice(1)} Loan Application
                    </CardTitle>
                    <Badge className={getStatusColor(application.status)}>
                      {formatStatus(application.status)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Applied on {new Date(application.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Requested Amount</p>
                      <p className="text-lg font-semibold">{formatCurrency(application.loan_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Application ID</p>
                      <p className="text-sm font-mono">{application.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No loan applications found.</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Apply for Your First Loan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}