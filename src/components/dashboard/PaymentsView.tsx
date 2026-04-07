import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

declare global {
  interface Window {
    Xendit: any;
  }
}

export default function PaymentsView() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');

  const fetchCards = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCards(data);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const validateForm = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      return 'Invalid card number';
    }
    if (!expMonth || Number(expMonth) < 1 || Number(expMonth) > 12) {
      return 'Invalid month';
    }
    if (!expYear || expYear.length !== 4) {
      return 'Invalid year';
    }
    if (!cvv || cvv.length < 3) {
      return 'Invalid CVV';
    }
    return '';
  };

  const handleAddCard = async () => {
    setErrorMsg('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setLoading(true);

      const xendit = window.Xendit;

      xendit.setPublishableKey(import.meta.env.VITE_XENDIT_PUBLIC_KEY);

      xendit.card.createToken(
        {
          amount: 10000,
          card_number: cardNumber.replace(/\s/g, ''),
          card_exp_month: expMonth,
          card_exp_year: expYear,
          card_cvn: cvv,
          is_multiple_use: true,
        },
        async (err: any, token: any) => {
          if (err) {
            setErrorMsg(err.message || 'Card failed');
            setLoading(false);
            return;
          }

          const { error } = await supabase.functions.invoke(
            'add-payment-method',
            {
              body: {
                token_id: token.id,
              },
            }
          );

          if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
          }

          setShowForm(false);
          setCardNumber('');
          setExpMonth('');
          setExpYear('');
          setCvv('');

          await fetchCards();
          setLoading(false);
        }
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle>Saved Cards</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              <div>
                <div className="font-medium text-sm">
                  {card.brand} •••• {card.last4}
                </div>
                <div className="text-xs text-muted-foreground">
                  Exp {card.exp_month}/{card.exp_year}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {card.is_default && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
            </div>
          ))}

          {!showForm && (
            <Button
              className="mt-4 w-full rounded-xl"
              onClick={() => setShowForm(true)}
            >
              Add Card
            </Button>
          )}

          {showForm && (
            <div className="space-y-4 border rounded-xl p-4 bg-gray-50">
              <div>
                <label className="text-xs text-muted-foreground">
                  Card Number
                </label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  className="mt-1 text-lg tracking-wide"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Month
                  </label>
                  <Input
                    placeholder="MM"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Year
                  </label>
                  <Input
                    placeholder="YYYY"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    CVV
                  </label>
                  <Input
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-sm text-red-500">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleAddCard}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Card'}
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Your card is securely processed and never stored on our servers.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}