import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Loan {
  id: string;
  current_balance: number;
  monthly_payment: number;
  status: string;
  loan_type: string;
  origination_date: string | null;
}

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
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getNextPaymentDate = (loan: Loan) => {
  const now = new Date();
  const originDate = loan.origination_date ? new Date(loan.origination_date) : now;
  const paymentDay = originDate.getDate();
  const tentative = new Date(now.getFullYear(), now.getMonth(), paymentDay);

  if (tentative <= now) {
    return new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
  }

  return tentative;
};

export function OverviewView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const { data, error } = await supabase
          .from('loans')
          .select('id, current_balance, monthly_payment, status, loan_type, origination_date')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setLoans(data || []);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load loan overview.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [toast]);

  const activeLoans = loans.filter((loan) => loan.status.toLowerCase() === 'active');
  const nextPayment = useMemo(() => {
    if (activeLoans.length === 0) return null;
    return [...activeLoans]
      .map((loan) => ({ loan, date: getNextPaymentDate(loan) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  }, [activeLoans]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <div className="text-center text-muted-foreground">Loading overview...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground">Your most important loan information at a glance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextPayment ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(nextPayment.loan.monthly_payment)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Due {nextPayment.date.toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextPayment.loan.loan_type.charAt(0).toUpperCase() + nextPayment.loan.loan_type.slice(1)} loan
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active loans with upcoming payments.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loan Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(activeLoans.reduce((sum, loan) => sum + loan.current_balance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Loans & Status</h2>
        {loans.length > 0 ? (
          <div className="grid gap-4">
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
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
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="font-medium text-foreground">Balance:</span>{' '}
                      {formatCurrency(loan.current_balance)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Next payment:</span>{' '}
                      {formatCurrency(loan.monthly_payment)} on {getNextPaymentDate(loan).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No loans found yet. Apply for a loan to see payment details here.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
