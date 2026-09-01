import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { FEATURES } from '@/config/features';
import { StripeCardSetup } from '@/components/payments/StripeCardSetup';

type PaymentMethodType = 'card';

type SavedPaymentMethod = {
  id: string;
  type: PaymentMethodType;
  nickname: string;
  details: string;
  isDefault: boolean;
};

const paymentMethodOptions = [
  {
    value: 'card',
    label: 'Credit / Debit card',
    description: 'Automatic charge on each scheduled repayment date.',
    icon: CreditCard,
  },
] as const;


export default function PaymentsView() {
  const { toast } = useToast();

  const [internalUserId, setInternalUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔥 Card form state

  // ✅ Make sure options ALWAYS exist (no silent failure)
  const availableMethodOptions =
    paymentMethodOptions.filter((option) => FEATURES.paymentMethodTypes?.[option.value]) ||
    paymentMethodOptions;

  useEffect(() => {
    if (!selectedMethod && availableMethodOptions.length) {
      setSelectedMethod(availableMethodOptions[0].value);
    }
  }, [availableMethodOptions, selectedMethod]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      setInternalUserId(user.id);

      setUserEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('stripe_payment_methods')
        .select('id, brand, last4, exp_month, exp_year, is_default, status')
        .eq('internal_user_id', user.id)
        .eq('status', 'authorized')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Unable to load payment methods',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const mapped: SavedPaymentMethod[] = (data ?? []).map((row) => ({
        id: row.id,
        type: 'card' as PaymentMethodType,
        nickname: `${row.brand ?? 'Card'} ending ${row.last4 ?? '----'}`,
        details:
          row.exp_month && row.exp_year
            ? `Expires ${String(row.exp_month).padStart(2, '0')}/${row.exp_year}`
            : 'Expiration unavailable',
        isDefault: !!row.is_default,
      }));

      setPaymentMethods(
        mapped.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      );
      setLoading(false);
    };

    void load();
  }, [toast]);

  const defaultMethod = useMemo(
    () => paymentMethods.find((method) => method.isDefault),
    [paymentMethods],
  );

  const removePaymentMethod = async (methodId: string) => {
    try {
      const method = paymentMethods.find((m) => m.id === methodId);

      if (!method) return;

      if (method.isDefault) {
        toast({
          title: 'Default payment method cannot be removed',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('stripe_payment_methods')
        .update({
          is_active: false,
        })
        .eq('id', methodId);

      if (error) {
        toast({
          title: 'Unable to remove payment method',
          description: error.message,
          variant: 'destructive',
        });

        return;
      }

      setPaymentMethods((prev) =>
        prev.filter((method) => method.id !== methodId)
      );

      toast({
        title: 'Payment method removed',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      // remove existing defaults
      const { error: clearError } = await supabase
        .from('stripe_payment_methods')
        .update({ is_default: false })
        .eq('internal_user_id', internalUserId);

      if (clearError) {
        toast({
          title: 'Unable to update default payment method',
          description: clearError.message,
          variant: 'destructive',
        });

        return;
      }

      // set new default
      const { error: setError } = await supabase
        .from('stripe_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (setError) {
        toast({
          title: 'Unable to update default payment method',
          description: setError.message,
          variant: 'destructive',
        });

        return;
      }

      // local UI update
      setPaymentMethods((prev) =>
        [...prev]
          .map((method) => ({
            ...method,
            isDefault: method.id === methodId,
          }))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      );

      toast({
        title: 'Default payment method updated',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  if (loading) {
    return <div className="p-6 text-center">Loading payment methods...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Payment Methods</h1>

      {/* 🔹 SAVED METHODS */}
      <Card>
        <CardContent className="space-y-4 p-6">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="font-medium">{method.nickname}</p>
                <p className="text-sm text-muted-foreground">
                  {method.details}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {method.isDefault && (
                  <Badge>
                    Default
                  </Badge>
                )}

                {!method.isDefault && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultPaymentMethod(method.id)}
                    >
                      Make Default
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePaymentMethod(method.id)}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 🔹 METHOD SELECTOR (THIS WAS MISSING) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Add payment method</h2>

        {availableMethodOptions.map((method) => {
          const isSelected = selectedMethod === method.value;
          const Icon = method.icon;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => setSelectedMethod(method.value)}
              className={`w-full rounded-lg border p-4 text-left ${
                isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <Icon className="h-5 w-5" />
                <div>
                  <p className="font-medium">{method.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>
                {isSelected && <Check className="ml-auto h-5 w-5" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 🔹 FORM */}
      <Card>
        <CardContent className="space-y-6 p-6">
          {selectedMethod === 'card' && (
            <StripeCardSetup
              onAuthorized={() => {
                // The webhook writes the row; reload to pick it up.
                window.location.reload();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
