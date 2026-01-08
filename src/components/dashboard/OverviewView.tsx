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
  const { toast } = useToast();
  const transactionsPageSize = 6;
  const navigate = useNavigate();

  const primaryLoanId = useMemo(() => {
    return nextPayment?.loan_id ?? loans[0]?.loan_id ?? null;
  }, [loans, nextPayment]);

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

  useEffect(() => {
    setTransactionsPage(1);
  }, [userId]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const from = (transactionsPage - 1) * transactionsPageSize;
        const to = from + transactionsPageSize - 1;

        const { data, error, count } = await supabase
          .from('loan_transactions')
          .select('id, loan_id, internal_user_id, date, amount, type, status', { count: 'exact' })
          .eq('internal_user_id', userId)
          .order('date', { ascending: false })
          .order('type', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setTransactions(data || []);
        setTransactionsTotal(count ?? 0);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load transaction history.",
          variant: "destructive"
        });
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [toast, userId, transactionsPage]);

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
        <button
          type="button"
          className="w-full text-left disabled:cursor-not-allowed"
          onClick={() => {
            if (primaryLoanId) {
              navigate(`/dashboard/loans/${primaryLoanId}`);
            }
          }}
          disabled={!primaryLoanId}
        >
          <Card variant="highlight" className="transition hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                <Calendar className="h-5 w-5 text-orange-700" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Next Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {nextPayment ? (
                <>
                  <div className="text-3xl font-bold text-foreground">
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
        </button>
        <button
          type="button"
          className="w-full text-left disabled:cursor-not-allowed"
          onClick={() => {
            if (primaryLoanId) {
              navigate(`/dashboard/loans/${primaryLoanId}`);
            }
          }}
          disabled={!primaryLoanId}
        >
          <Card variant="highlight" className="transition hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                <Calendar className="h-5 w-5 text-orange-700" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Balance
              </CardTitle>
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
        </button>
            )}
          </CardContent>
        </Card>
        <Card variant="highlight">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
              <Calendar className="h-5 w-5 text-orange-700" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
            
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
              <button
                type="button"
                key={loan.loan_id}
                className="w-full text-left"
                onClick={() => navigate(`/dashboard/loans/${loan.loan_id}`)}
              >
                <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{formatCurrency(loan.loan_amount)}</CardTitle>
                      <CardDescription>Details</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                      <div>
                        <span className="font-medium text-foreground">Balance:</span>{' '}
                        {formatCurrency(loan.total_balance)}
                      </div>

                      <div>
                        <span className="font-medium text-foreground">Term:</span>{' '}
                        {loan.term_months} months
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Interest rate:</span>{' '}
                        {loan.interest_rate * 100}%
                      </div>
                      <div />
                      <div>
                        <span className="font-medium text-foreground">Start date:</span>{' '}
                        {loan.start_date
                          ? `${new Date(loan.start_date).toLocaleDateString()}`
                          : 'unavailable'}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">End date:</span>{' '}
                        {loan.end_date ? new Date(loan.end_date).toLocaleDateString() : 'Unavailable'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
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

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Recent deposits and payments across your loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Loan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const isPayment = transaction.type.toLowerCase() === 'payment';
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transaction.loan_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'completed' ? 'secondary' : 'outline'}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              isPayment ? 'text-destructive' : 'text-success'
                            }`}
                          >
                            {isPayment ? '-' : '+'}{formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
                <span>
                  Showing {(transactionsPage - 1) * transactionsPageSize + 1}-
                  {Math.min(transactionsPage * transactionsPageSize, transactionsTotal)} of{' '}
                  {transactionsTotal} transactions
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactionsPage === 1}
                    onClick={() => setTransactionsPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {transactionsPage} of {Math.max(1, Math.ceil(transactionsTotal / transactionsPageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={transactionsPage >= Math.ceil(transactionsTotal / transactionsPageSize)}
                    onClick={() =>
                      setTransactionsPage((page) => Math.min(page + 1, Math.ceil(transactionsTotal / transactionsPageSize)))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No transactions yet. Deposits and payments will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
