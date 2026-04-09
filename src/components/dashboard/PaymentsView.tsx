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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  const validateForm = () => {
    if (!firstName || !lastName) return 'Cardholder name required';

    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.length < 13) return 'Invalid card number';

    const month = Number(expMonth);
    const year = Number(expYear);

    if (month < 1 || month > 12) return 'Invalid month';
    if (!year || expYear.length !== 4) return 'Invalid year';

    const now = new Date();
    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      return 'Card expired';
    }

    if (cvv.length < 3) return 'Invalid CVV';

    return '';
  };

  // ✅ Convert Xendit callback → Promise
  const createToken = (userEmail: string) =>
    new Promise<any>((resolve, reject) => {
      window.Xendit.card.createToken(
        {
          amount: 10000,
          card_holder_first_name: firstName,
          card_holder_last_name: lastName,
          card_holder_email: userEmail,
          card_number: cardNumber.replace(/\s/g, ''),
          card_exp_month: String(expMonth),
          card_exp_year: String(expYear),
          card_cvv: cvv,
          is_multiple_use: true,
        },
        (err: any, token: any) => {
          if (err) return reject(err);
          resolve(token);
        }
      );
    });

  const handleAddCard = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      if (!window.Xendit) {
        throw new Error('Payment system not loaded');
      }

      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not logged in');

      const userEmail = user.email;

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) throw new Error('Missing auth token');

      const xendit = window.Xendit;
      xendit.setPublishableKey(
        import.meta.env.VITE_XENDIT_PUBLIC_KEY
      );

      // ✅ Token creation (awaited)
      const token = await Promise.race([
        createToken(userEmail),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Token timeout')), 10000)
        ),
      ]);

      console.log('TOKEN:', token);

      // ✅ Call edge function directly (no proxy issues)
      //`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-payment-method`,
  
      const res = await fetch(
  `https://fklaxhpublxhgxcajuyu.supabase.co/functions/v1/add-payment-method`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token_id: token.id,
      first_name: firstName,
      last_name: lastName,
      email: userEmail,
    }),
  }
);

  const raw = await res.text();

      console.log('RAW RESPONSE:', raw);

      let result;
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.error('NON-JSON RESPONSE:', raw);
        throw new Error('Server returned invalid response');
      }

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save card');
      }

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save card');
      }

      // ✅ Reset UI
      setShowForm(false);
      setFirstName('');
      setLastName('');
      setCardNumber('');
      setExpMonth('');
      setExpYear('');
      setCvv('');

      await fetchCards();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false); // ✅ ALWAYS runs
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Saved Cards</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex justify-between border p-4 rounded-xl"
            >
              <div>
                {card.brand} •••• {card.last4}
                <div className="text-xs">
                  Exp {card.exp_month}/{card.exp_year}
                </div>
              </div>
              {card.is_default && <Badge>Default</Badge>}
            </div>
          ))}

          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              Add Card
            </Button>
          )}

          {showForm && (
            <div className="space-y-4 border p-4 rounded-xl">
              <Input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />

              <Input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />

              <Input
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 16);
                  setCardNumber(
                    raw.replace(/(.{4})/g, '$1 ').trim()
                  );
                }}
              />

              <div className="grid grid-cols-3 gap-2">
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

              {errorMsg && (
                <div className="text-red-500 text-sm">
                  {errorMsg}
                </div>
              )}

              <Button onClick={handleAddCard} disabled={loading}>
                {loading ? 'Saving...' : 'Save Card'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}