import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// =========================
// TYPES
// =========================
interface NextPayment {
  loan_id: string;
  due_date: string;
  remaining_amount: number;
}

interface Transaction {
  loan_id: string;
  payment_id: string | null;
  transaction_date: string;
  amount: number;
  type: string;
}

interface OverviewViewProps {
  userEmail?: string;
}

// =========================
// COMPONENT
// =========================
export function OverviewView({ userEmail }: OverviewViewProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPayingNextDue, setIsPayingNextDue] = useState(false);
  const paymentFallbackLink = import.meta.env.VITE_PAYMENT_LINK_URL as string | undefined;

  const transactionsPageSize = 6;

  // =========================
  // RESOLVE EMAIL (IMPERSONATION FIRST)
  // =========================
  useEffect(() => {
    const urlEmail = searchParams.get('email');

    // Priority: explicit URL impersonation email
    if (urlEmail) {
      setEmail(urlEmail.toLowerCase());
      return;
    }

    // Fallback: email provided by dashboard state
    if (userEmail) {
      setEmail(userEmail.toLowerCase());
      return;
    }

    setEmail(null);
    setLoading(false);
    setTransactionsLoading(false);
  }, [searchParams, userEmail]);

  // =========================
  // OVERVIEW DATA
  // =========================
  useEffect(() => {
    if (!email) return;

    setLoading(true);

    const fetchOverview = async () => {
      try {
        const [
          { data: paymentData, error: paymentError },
          { data: balanceData, error: balanceError }
        ] = await Promise.all([
          supabase
            .from('next_payment_due')
            .select('*')
            .eq('email', email)
            .limit(1),

          supabase
            .from('user_outstanding_balance')
            .select('*')
            .eq('email', email)
            .limit(1)
        ]);

        if (paymentError) throw paymentError;
        if (balanceError) throw balanceError;

        setNextPayment(paymentData?.[0] ?? null);
        setBalance(balanceData?.[0]?.total_outstanding_balance ?? 0);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load overview.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [email]);

  // =========================
  // TRANSACTIONS
  // =========================
  useEffect(() => {
    if (!email) return;

    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);

        const { data, count, error } = await supabase
          .from('user_transaction_history')
          .select('*', { count: 'exact' })
          .eq('email', email)
          .order('transaction_date', { ascending: false })
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
  }, [email, transactionsPage]);

  const primaryLoanId = nextPayment?.loan_id ?? null;
  const canOpenLoan = Boolean(primaryLoanId);

  const openNextPaymentLink = async () => {
    if (!nextPayment || !email) return;

    setIsPayingNextDue(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: {
          amount: nextPayment.remaining_amount,
          dueDate: nextPayment.due_date,
          paymentNumber: 1,
          totalPayments: 1,
          loanId: nextPayment.loan_id,
          description: 'Overview next payment due',
          customer: {
            given_names: email.split('@')[0],
            email,
          },
        },
      });

      if (error) throw error;
      if (!data?.invoice_url) throw new Error('No invoice_url returned from payment provider.');

      window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      if (paymentFallbackLink) {
        const fallbackUrl = new URL(paymentFallbackLink);
        fallbackUrl.searchParams.set('utm_source', 'overview_next_payment_due');
        fallbackUrl.searchParams.set('amount', String(nextPayment.remaining_amount));
        fallbackUrl.searchParams.set(
          'description',
          `Payment due on ${new Date(nextPayment.due_date).toLocaleDateString()}`
        );
        window.open(fallbackUrl.toString(), '_blank', 'noopener,noreferrer');
        return;
      }

      toast({
        title: 'Unable to start payment',
        description:
          err?.message ??
          'Failed to create payment link. Ensure create-payment-link is deployed.',
        variant: 'destructive'
      });
    } finally {
      setIsPayingNextDue(false);
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <div className="grid gap-6 md:grid-cols-2">
        <button
          type="button"
          className="w-full text-left disabled:cursor-not-allowed"
          onClick={() => primaryLoanId && navigate(`/dashboard/loans/${primaryLoanId}`)}
          disabled={!canOpenLoan}
        >
          <Card variant="highlight">
            <CardHeader>
              <Calendar className="h-5 w-5 text-orange-700" />
              <CardTitle className="text-sm text-muted-foreground">
                Next Payment Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextPayment ? (
                <>
                  <div className="text-3xl font-bold">
                    {formatCurrency(nextPayment.remaining_amount)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Due {new Date(nextPayment.due_date).toLocaleDateString()}
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void openNextPaymentLink();
                    }}
                    disabled={isPayingNextDue}
                  >
                    {isPayingNextDue ? 'Opening…' : 'Pay Now'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming payments.
                </p>
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
              {formatCurrency(balance)}
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
            <div className="py-6 text-center text-muted-foreground">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No transactions.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {new Date(t.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.type}</Badge>
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
