import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
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

interface LoanTransaction {
  id: number;
  loan_id: string;
  internal_user_id: string;
  date: string;
  amount: number;
  type: string;
  status: string;
}

interface OverviewViewProps {
  userId: string;
}

export function OverviewView({ userId }: OverviewViewProps) {
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const transactionsPageSize = 6;
  const navigate = useNavigate();
  const { toast } = useToast();

  const primaryLoanId = useMemo(
    () => nextPayment?.loan_id ?? loans[0]?.loan_id ?? null,
    [loans, nextPayment]
  );

  // =========================
  // OVERVIEW DATA
  // =========================
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [
          { data: loansData, error: loansError },
          { data: paymentData, error: paymentError }
        ] = await Promise.all([
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

        setLoans(loansData ?? []);
        setNextPayment(paymentData?.[0] ?? null);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load loan overview.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [userId, toast]);

  // =========================
  // TRANSACTIONS
  // =========================
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);

        const { data, count, error } = await supabase
          .from('loan_transactions')
          .select('*', { count: 'exact' })
          .eq('internal_user_id', userId)
          .order('date', { ascending: false })
          .range(
            (transactionsPage - 1) * transactionsPageSize,
            transactionsPage * transactionsPageSize - 1
          );

        if (error) throw error;

        setTransactions(data ?? []);
        setTransactionsTotal(count ?? 0);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load transactions.',
          variant: 'destructive'
        });
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [userId, transactionsPage, toast]);

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          className="w-full text-left disabled:cursor-not-allowed"
          onClick={() => primaryLoanId && navigate(`/dashboard/loans/${primaryLoanId}`)}
          disabled={!primaryLoanId}
        >
          <Card variant="highlight">
            <CardHeader>
              <Calendar className="h-5 w-5 text-orange-700" />
              <CardTitle className="text-sm text-muted-foreground">Next Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {nextPayment ? (
                <>
                  <div className="text-3xl font-bold">
                    {formatCurrency(nextPayment.remaining_amount)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Due {new Date(nextPayment.date).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming payments.</p>
              )}
            </CardContent>
          </Card>
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.reduce((s, l) => s + l.total_balance, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="py-6 text-center text-muted-foreground">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">No transactions.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex justify-between text-sm">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={transactionsPage === 1}
                  onClick={() => setTransactionsPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={transactionsPage * transactionsPageSize >= transactionsTotal}
                  onClick={() => setTransactionsPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
