import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpRight, ArrowDownLeft, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LoanTransaction {
  id: number;
  loan_id: string;
  internal_user_id: string;
  loan_amount: number;
  loan_status: string;
  current_balance: number;
  is_fully_paid: boolean;
  next_due_date: string | null;
  is_next_due: boolean;
  schedule_id: string | null;
  payment_id: string | null;
  date: string;
  amount: number;
  remaining_amount: number;
  type: 'Installment' | 'Payment';
  status: string;
  is_overdue: boolean;
  days_overdue: number;
  running_balance: number;
}

export function TransactionsView() {
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('loan_transactions_1')
        .select('*')
        .eq('internal_user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const payments = transactions.filter(t => t.type === 'Payment');
  const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);

  const now = new Date();
  const thisMonthPayments = payments.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  });

  const thisMonthTotal = thisMonthPayments.reduce((sum, t) => sum + t.amount, 0);

  const latestBalance = transactions.length > 0
    ? transactions[0].running_balance
    : 0;

  const isFullyPaid = transactions.length > 0
    ? transactions[0].is_fully_paid
    : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
        <div className="text-center text-muted-foreground">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isFullyPaid ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(latestBalance)}
            </div>
            {isFullyPaid && (
              <p className="text-xs text-success">Loan fully paid</p>
            )}
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(thisMonthTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthPayments.length} payment{thisMonthPayments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>
            Installments and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((t) => {
                const isPayment = t.type === 'Payment';

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors
                      ${t.is_overdue ? 'bg-destructive/10 border-destructive' : 'hover:bg-muted/50'}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${isPayment ? 'bg-success/10' : 'bg-muted'}`}>
                        {isPayment
                          ? <ArrowUpRight className="h-4 w-4 text-success" />
                          : <Calendar className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>

                      <div>
                        <p className="font-medium">
                          {isPayment ? 'Payment' : 'Installment Due'}
                        </p>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{new Date(t.date).toLocaleDateString()}</span>

                          {t.is_next_due && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary">Next Due</Badge>
                            </>
                          )}

                          {t.is_overdue && (
                            <>
                              <span>•</span>
                              <Badge variant="destructive">
                                {t.days_overdue} days overdue
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-semibold ${isPayment ? 'text-success' : ''}`}>
                        {isPayment
                          ? `-${formatCurrency(t.amount)}`
                          : formatCurrency(t.amount)
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(t.running_balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowDownLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
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