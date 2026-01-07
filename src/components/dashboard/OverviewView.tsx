import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LoanSummary {
  loan_id: string;
  loan_amount: number;
  term_months: number;
  interest_rate: number;
  start_date: string | null;
  end_date: string | null;
  total_balance: number;
}

interface NextPayment {
  loan_id: string;
  date: string;
  remaining_amount: number;
}

interface OverviewViewProps {
  userId: string;
}

export function OverviewView({ userId }: OverviewViewProps) {
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [{ data: loansData, error: loansError }, { data: paymentData, error: paymentError }] =
          await Promise.all([
            supabase
              .from('user_loans_summary')
              .select('loan_id, loan_amount, term_months, interest_rate, start_date, end_date, total_balance')
              .eq('internal_user_id', userId)
              .order('end_date', { ascending: false }),
            supabase
              .from('outstanding_payment_schedules')
              .select('loan_id, date, remaining_amount')
              .eq('internal_user_id', userId)
              .order('date', { ascending: true })
              .limit(1)
          ]);

        if (loansError) throw loansError;
        if (paymentError) throw paymentError;

        setLoans(loansData || []);
        setNextPayment(paymentData?.[0] ?? null);
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

    fetchOverview();
  }, [toast, userId]);

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
                  {formatCurrency(nextPayment.remaining_amount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(nextPayment.date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming payments scheduled.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.reduce((sum, loan) => sum + loan.total_balance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {loans.length} loan{loans.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Loans</h2>
        {loans.length > 0 ? (
          <div className="grid gap-4">
            {loans.map((loan) => (
              <Card key={loan.loan_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Loan {loan.loan_id.slice(0, 8)}...</CardTitle>
                    <CardDescription>
                      {loan.start_date
                        ? `Started ${new Date(loan.start_date).toLocaleDateString()}`
                        : 'Start date unavailable'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Balance:</span>{' '}
                      {formatCurrency(loan.total_balance)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Loan amount:</span>{' '}
                      {formatCurrency(loan.loan_amount)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Term:</span>{' '}
                      {loan.term_months} months
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Interest rate:</span>{' '}
                      {loan.interest_rate}%
                    </div>
                    <div>
                      <span className="font-medium text-foreground">End date:</span>{' '}
                      {loan.end_date ? new Date(loan.end_date).toLocaleDateString() : 'Unavailable'}
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
