import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BriefcaseBusiness, Check, CreditCard, Landmark, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FEATURES } from '@/config/features';

declare global {
  interface Window {
    Xendit: any;
  }
}

type PaymentMethodType = 'payroll' | 'card' | 'ach';

type SavedPaymentMethod = {
  id: string;
  type: PaymentMethodType;
  nickname: string;
  details: string;
  isDefault: boolean;
};

const paymentMethodOptions = [
  {
    value: 'payroll',
    label: 'Payroll deduction',
    description: 'Repay automatically from each paycheck.',
    icon: BriefcaseBusiness,
  },
  {
    value: 'card',
    label: 'Credit / Debit card',
    description: 'Recurring monthly charge to your card.',
    icon: CreditCard,
  },
  {
    value: 'ach',
    label: 'Bank authorization (ACH)',
    description: 'Direct debit from your bank account.',
    icon: Landmark,
  },
] as const;

const providerToType = (brand: string | null): PaymentMethodType => {
  if (brand === 'payroll') return 'payroll';
  if (brand === 'ach') return 'ach';
  return 'card';
};

export default function PaymentsView() {
  const { toast } = useToast();

  const [internalUserId, setInternalUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔥 Card form state
  const [cardForm, setCardForm] = useState({
    name: '',
    number: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    email: '',
    phone: '',
  });

  // ✅ Make sure options ALWAYS exist (no silent failure)
  const availableMethodOptions =
    paymentMethodOptions.filter((option) => FEATURES.paymentMethodTypes?.[option.value]) ||
    paymentMethodOptions;

  useEffect(() => {
    if (!selectedMethod && availableMethodOptions.length) {
      setSelectedMethod(availableMethodOptions[0].value);
    }
  }, [availableMethodOptions, selectedMethod]);

  // 🔥 Init Xendit
  useEffect(() => {
    if (window.Xendit) {
      window.Xendit.setPublishableKey(
        import.meta.env.VITE_XENDIT_PUBLIC_KEY
      );
    }
  }, []);

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
        .from('payment_methods')
        .select('id, brand, last4, exp_month, exp_year, is_default, provider')
        .eq('internal_user_id', user.id)
        .eq('is_active', true)
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

      const mapped: SavedPaymentMethod[] = (data ?? [])
        .map((row) => {
          const type = providerToType(row.brand);

          const details =
            type === 'card'
              ? `${row.brand ?? 'Card'} •••• ${row.last4 ?? '----'}`
              : type === 'ach'
              ? `Bank account ending ${row.last4 ?? '----'}`
              : `Payroll method`;

          return {
            id: row.id,
            type,
            nickname:
              type === 'card'
                ? `${row.brand ?? 'Card'} ending ${row.last4 ?? '----'}`
                : type === 'ach'
                ? 'ACH account'
                : 'Payroll deduction',
            details,
            isDefault: !!row.is_default,
          };
        });

      setPaymentMethods(mapped);
      setLoading(false);
    };

    void load();
  }, [toast]);

  const defaultMethod = useMemo(
    () => paymentMethods.find((method) => method.isDefault),
    [paymentMethods],
  );

  const saveNewMethod = async () => {
    if (!selectedMethod || !internalUserId) return;

    setSaving(true);

    // 🔥 CARD FLOW FIXED
    if (selectedMethod === 'card') {
      if (!window.Xendit) {
        toast({ title: 'Xendit not loaded', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const cleanNumber = cardForm.number.replace(/\s/g, '');
      const [first_name, ...rest] = cardForm.name.split(' ');
      const last_name = rest.join(' ') || 'NA';

      window.Xendit.card.createToken(
        {
          amount: 0,
          card_number: cleanNumber,
          card_exp_month: cardForm.expMonth,
          card_exp_year: cardForm.expYear,
          card_cvn: cardForm.cvv,
          is_multiple_use: true,
          should_authenticate: true,

          // 🔥 NEW FIELDS
          card_holder_first_name: first_name,
          card_holder_last_name: last_name,
          card_holder_email: cardForm.email,
          card_holder_phone_number: cardForm.phone,
        },
        async (err: any, token: any) => {
          if (err) {
            toast({
              title: 'Card error',
              description: err.message,
              variant: 'destructive',
            });
            setSaving(false);
            return;
          }

          const { error } = await supabase.functions.invoke(
            'add-payment-method',
            {
              body: {
                token_id: token.id,
                first_name,
                last_name,
              },
            }
          );

          if (error) {
            toast({
              title: 'Failed to save card',
              description: error.message,
              variant: 'destructive',
            });
          } else {
            toast({ title: 'Card added successfully' });
          }

          setSaving(false);
        }
      );

      return;
    }

    // ACH + Payroll unchanged
    const { error } = await supabase.functions.invoke('add-payment-method', {
      body: {
        payment_type: selectedMethod,
        email: userEmail,
      },
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Payment method saved' });
    }

    setSaving(false);
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
            <div key={method.id} className="flex justify-between border p-3 rounded">
              <div>
                <p className="font-medium">{method.nickname}</p>
                <p className="text-sm text-muted-foreground">{method.details}</p>
              </div>
              {method.isDefault && <Badge>Default</Badge>}
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
          {selectedMethod === 'payroll' && <PayrollForm />}
          {selectedMethod === 'card' && (
            <CardForm cardForm={cardForm} setCardForm={setCardForm} />
          )}
          {selectedMethod === 'ach' && <AchForm />}

          <div className="flex justify-end">
            <Button onClick={saveNewMethod} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save payment method'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CardForm({ cardForm, setCardForm }: any) {
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h3 className="text-lg font-semibold">Add Card</h3>
        <p className="text-sm text-muted-foreground">
          Enter your card details securely. We use encrypted processing via Xendit.
        </p>
      </div>

      {/* CARD NUMBER */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Number</label>
        <Input
          placeholder="1234 5678 9012 3456"
          value={cardForm.number}
          onChange={(e) =>
            setCardForm({
              ...cardForm,
              number: formatCardNumber(e.target.value),
            })
          }
          className="text-lg tracking-widest"
        />
      </div>

      {/* NAME */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Cardholder Name</label>
        <Input
          placeholder="Juan Dela Cruz"
          value={cardForm.name}
          onChange={(e) =>
            setCardForm({ ...cardForm, name: e.target.value })
          }
        />
      </div>

      {/* EMAIL + PHONE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            placeholder="juan@email.com"
            type="email"
            value={cardForm.email}
            onChange={(e) =>
              setCardForm({ ...cardForm, email: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Phone Number</label>
          <Input
            placeholder="+639XXXXXXXXX"
            value={cardForm.phone}
            onChange={(e) =>
              setCardForm({
                ...cardForm,
                phone: e.target.value.replace(/[^\d+]/g, ''),
              })
            }
          />
        </div>
      </div>

      {/* EXPIRY + CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Input
            placeholder="MM"
            maxLength={2}
            value={cardForm.expMonth}
            onChange={(e) =>
              setCardForm({
                ...cardForm,
                expMonth: e.target.value.replace(/\D/g, ''),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Input
            placeholder="YYYY"
            maxLength={4}
            value={cardForm.expYear}
            onChange={(e) =>
              setCardForm({
                ...cardForm,
                expYear: e.target.value.replace(/\D/g, ''),
              })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">CVV</label>
          <Input
            placeholder="123"
            maxLength={4}
            type="password"
            value={cardForm.cvv}
            onChange={(e) =>
              setCardForm({
                ...cardForm,
                cvv: e.target.value.replace(/\D/g, ''),
              })
            }
          />
        </div>
      </div>

      {/* TRUST / SECURITY */}
      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        🔒 Your card details are encrypted and securely processed. We never store full card information.
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
function PayrollForm() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label="Employee ID">
        <Input placeholder="EMP-12345" />
      </Field>
      <Field label="Pay frequency">
        <Select>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
            <SelectItem value="semi-monthly">Semi-monthly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function AchForm() {
  return (
    <div className="space-y-6">
      <Field label="Account holder name">
        <Input />
      </Field>
      <Field label="Bank name">
        <Input />
      </Field>
      <Field label="Routing number">
        <Input placeholder="123456789" />
      </Field>
      <Field label="Account number">
        <Input />
      </Field>
      <label className="flex items-start gap-4">
        <Checkbox className="mt-0.5" />
        <span className="text-sm text-muted-foreground">
          I authorize recurring ACH debits from the account above.
        </span>
      </label>
    </div>
  );
}