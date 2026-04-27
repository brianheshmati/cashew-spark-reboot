import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  loan_id: string;
  payment_id: string | null;
  transaction_date: string;
  amount: number;
  type: 'Loan Disbursement' | 'Payment';
  email: string;
}

interface NextPayment {
  loan_id?: string;
  due_date: string;
  remaining_amount: number;
}

interface TransactionsViewProps {
  internalUserId?: string;
}

export function TransactionsView({ internalUserId }: TransactionsViewProps) {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextPayment, setNextPayment] = useState<NextPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPayingNextDue, setIsPayingNextDue] = useState(false);
  const paymentFallbackLink = import.meta.env.VITE_PAYMENT_LINK_URL as string | undefined;

  // =========================
  // RESOLVE EMAIL (IMPERSONATION FIRST)
  // =========================
  useEffect(() => {
    const init = async () => {
      const urlEmail = searchParams.get('email');

      if (urlEmail) {
        setEmail(urlEmail.toLowerCase());
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('userProfiles')
        .select('email')
        .eq('internal_user_id', internalUserId ?? authUser.id)
        .single();

      if (error || !data?.email) {
        toast({
          title: "Error",
          description: "Failed to resolve user email",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      setEmail(data.email.toLowerCase());
    };

    init();
  }, [internalUserId, searchParams]);

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    if (!email) return;

    const fetchData = async () => {
      try {
        const [
          { data: txData, error: txError },
          { data: nextData, error: nextError }
        ] = await Promise.all([
          supabase
            .from('user_transaction_history')
            .select('*')
            .eq('email', email)
            .order('transaction_date', { ascending: false }),

          supabase
            .from('next_payment_due')
            .select('*')
            .eq('email', email)
            .limit(1)
        ]);

        if (txError) throw txError;
        if (nextError) throw nextError;

        setTransactions(txData || []);
        setNextPayment(nextData?.[0] ?? null);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email]);

  // =========================
  // METRICS
  // =========================
  const payments = transactions.filter(t => t.type === 'Payment');

  const totalPaid = payments.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount ?? 0)),
    0
  );

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
          description: 'Dashboard next payment due',
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
        fallbackUrl.searchParams.set('utm_source', 'dashboard_next_payment_due');
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
        variant: 'destructive',
      });
    } finally {
      setIsPayingNextDue(false);
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <div className="text-center text-muted-foreground">
          Loading transactions...
        </div>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transaction History</h1>
      </div>

      {/* METRICS */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* TOTAL PAID */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* NEXT PAYMENT */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Next Payment Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextPayment ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(nextPayment.remaining_amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Due {new Date(nextPayment.due_date).toLocaleDateString()}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={openNextPaymentLink}
                  disabled={isPayingNextDue}
                >
                  {isPayingNextDue ? 'Opening…' : 'Pay Now'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming payments
              </p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* LEDGER */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>
            Loan disbursements and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((t, i) => {
                const isPayment = t.type === 'Payment';

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${isPayment ? 'bg-success/10' : 'bg-muted'}`}>
                        {isPayment
                          ? <ArrowUpRight className="h-4 w-4 text-success" />
                          : <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>

                      <div>
                        <p className="font-medium">{t.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(t.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-semibold ${isPayment ? 'text-success' : ''}`}>
                        {isPayment
                          ? formatCurrency(Math.abs(t.amount))
                          : formatCurrency(t.amount)
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
              <p className="text-muted-foreground">
                Your loan activity will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
