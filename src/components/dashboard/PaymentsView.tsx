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

  // =========================
  // FETCH SAVED CARDS
  // =========================
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

  // =========================
  // VALIDATION
  // =========================
  const validateForm = () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    if (!cleanNumber || cleanNumber.length < 13) {
      return 'Invalid card number';
    }

    const month = Number(expMonth);
    const year = Number(expYear);

    if (!month || month < 1 || month > 12) {
      return 'Invalid month';
    }

    if (!year || expYear.length !== 4) {
      return 'Invalid year';
    }

    // expiration check
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return 'Card is expired';
    }

    if (!cvv || cvv.length < 3) {
      return 'Invalid CVV';
    }

    return '';
  };

  // =========================
  // ADD CARD
  // =========================
  const handleAddCard = async () => {
    setErrorMsg('');

    // env check
    if (!import.meta.env.VITE_XENDIT_PUBLIC_KEY) {
      setErrorMsg('Payment configuration missing');
      return;
    }

    if (!window.Xendit) {
      setErrorMsg('Payment system not loaded');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setLoading(true);

      const xendit = window.Xendit;
      xendit.setPublishableKey(
        import.meta.env.VITE_XENDIT_PUBLIC_KEY
      );

      xendit.card.createToken(
        {
          amount: 10000,
          card_number: cardNumber.replace(/\s/g, ''),
          card_exp_month: String(expMonth),
          card_exp_year: String(expYear), // ✅ FULL YEAR
          card_cvv: cvv,
          is_multiple_use: true,
        },
        async (err: any, token: any) => {
          if (err) {
            console.error('Xendit error:', err);
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

          // reset
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

  // =========================
  // UI
  // =========================
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle>New Card</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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

              {card.is_default && (
                <Badge variant="secondary">Default</Badge>
              )}
            </div>
          ))}

          {!showForm && (
            <Button
              className="w-full rounded-xl"
              onClick={() => setShowForm(true)}
            >
              Add Card
            </Button>
          )}

          {showForm && (
            <div className="space-y-4 border rounded-2xl p-5 bg-white shadow-sm">
              {/* CARD NUMBER */}
              <div>
                <label className="text-xs text-muted-foreground">
                  Card Number
                </label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => {
                    const raw = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 16);
                    const formatted = raw
                      .replace(/(.{4})/g, '$1 ')
                      .trim();
                    setCardNumber(formatted);
                  }}
                  className="mt-1 text-lg tracking-widest"
                />
              </div>

              {/* EXP + CVV */}
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="MM"
                  value={expMonth}
                  onChange={(e) =>
                    setExpMonth(
                      e.target.value.replace(/\D/g, '').slice(0, 2)
                    )
                  }
                />

                <Input
                  placeholder="YYYY"
                  value={expYear}
                  onChange={(e) =>
                    setExpYear(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                />

                <Input
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) =>
                    setCvv(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                />
              </div>

              {/* ERROR */}
              {errorMsg && (
                <div className="text-sm text-red-500 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* ACTIONS */}
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
                  onClick={() => {
                    setShowForm(false);
                    setErrorMsg('');
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Secure card processing via Xendit. We do not store card data.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}