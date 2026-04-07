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

  const setDefault = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setLoading(true);

    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('internal_user_id', user.id);

    await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    await fetchCards();
    setLoading(false);
  };

  const handleAddCard = async () => {
    try {
      const xendit = window.Xendit;

      xendit.setPublishableKey(import.meta.env.VITE_XENDIT_PUBLIC_KEY);

      xendit.card.createToken(
        {
          amount: 10000,
          card_number: cardNumber,
          card_exp_month: expMonth,
          card_exp_year: expYear,
          card_cvn: cvv,
          is_multiple_use: true,
        },
        async (err: any, token: any) => {
          if (err) {
            console.error(err);
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
            console.error(error);
            return;
          }

          setShowForm(false);
          setCardNumber('');
          setExpMonth('');
          setExpYear('');
          setCvv('');

          await fetchCards();
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Saved Cards</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {cards.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No cards added yet.
            </div>
          )}

          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div>
                <div className="font-medium">
                  {card.brand} •••• {card.last4}
                </div>
                <div className="text-sm text-muted-foreground">
                  Exp {card.exp_month}/{card.exp_year}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {card.is_default && (
                  <Badge variant="secondary">Default</Badge>
                )}

                {!card.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDefault(card.id)}
                    disabled={loading}
                  >
                    Set Default
                  </Button>
                )}
              </div>
            </div>
          ))}

          {!showForm && (
            <Button className="mt-4 w-full" onClick={() => setShowForm(true)}>
              Add Card
            </Button>
          )}

          {showForm && (
            <div className="space-y-2">
              <Input
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <Input
                placeholder="MM"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
              />
              <Input
                placeholder="YYYY"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
              />
              <Input
                placeholder="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
              />

              <Button onClick={handleAddCard}>Save Card</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}