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
import { PaymentMethod } from '@/types/payments';

export default function PaymentsView() {
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCards(data);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const setDefault = async (id: string) => {
    setLoading(true);

    // reset all
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .neq('id', '');

    // set selected
    await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    await fetchCards();
    setLoading(false);
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

          <Button className="mt-4 w-full">
            Add Card
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}