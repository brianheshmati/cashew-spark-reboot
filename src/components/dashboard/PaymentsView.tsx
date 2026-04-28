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

type PaymentMethod = 'payroll' | 'card' | 'ach';

type SavedPaymentMethod = {
  id: string;
  type: PaymentMethod;
  nickname: string;
  details: string;
  isDefault: boolean;
};

const paymentMethodOptions = [
  { value: 'payroll', label: 'Payroll deduction', description: 'Repay automatically from each paycheck.', icon: BriefcaseBusiness },
  { value: 'card', label: 'Credit / Debit card', description: 'Recurring monthly charge to your card.', icon: CreditCard },
  { value: 'ach', label: 'Bank authorization (ACH)', description: 'Direct debit from your bank account.', icon: Landmark },
] as const;

const providerToType = (brand: string | null): PaymentMethod => {
  if (brand === 'payroll') return 'payroll';
  if (brand === 'ach') return 'ach';
  return 'card';
};

const initialMethods: SavedPaymentMethod[] = [
  { id: 'pm_1', type: 'payroll', nickname: 'Primary payroll', details: 'Employee ID ending 2345' },
  { id: 'pm_2', type: 'card', nickname: 'Visa personal', details: '•••• 4242 · Expires 12/27' },
  { id: 'pm_3', type: 'ach', nickname: 'Checking account', details: 'Bank account ending 0987' },
];

export default function PaymentsView() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [internalUserId, setInternalUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!FEATURES.paymentMethods) {
    return <div className="p-6 text-center text-gray-500">Payment Methods feature is not enabled.</div>;
  }

  const availableMethodOptions = paymentMethodOptions.filter((option) => FEATURES.paymentMethodTypes[option.value]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(availableMethodOptions[0]?.value ?? null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      setInternalUserId(userId);

      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, brand, last4, exp_month, exp_year, is_default, provider')
        .eq('internal_user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Unable to load payment methods', description: error.message, variant: 'destructive' });
      } else {
        const mapped = (data ?? [])
          .map((row) => {
            const type = providerToType(row.brand);
            if (!FEATURES.paymentMethodTypes[type]) return null;
            const details =
              type === 'card'
                ? `${row.brand ?? 'Card'} •••• ${row.last4 ?? '----'}${row.exp_month && row.exp_year ? ` · Expires ${row.exp_month}/${row.exp_year}` : ''}`
                : type === 'ach'
                  ? `Bank account ending ${row.last4 ?? '----'}`
                  : `Payroll method (${row.provider})`;
            return {
              id: row.id,
              type,
              nickname: type === 'card' ? `${row.brand ?? 'Card'} ending ${row.last4 ?? '----'}` : type === 'ach' ? 'ACH account' : 'Payroll deduction',
              details,
              isDefault: !!row.is_default,
            } satisfies SavedPaymentMethod;
          })
          .filter((row): row is SavedPaymentMethod => Boolean(row));
        setPaymentMethods(mapped);
      }

      setLoading(false);
    };

    void load();
  }, [toast]);

  const defaultMethod = useMemo(() => paymentMethods.find((method) => method.isDefault), [paymentMethods]);

  const setDefault = async (methodId: string) => {
    if (!internalUserId) return;
    setSaving(true);

    const { error: clearError } = await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('internal_user_id', internalUserId)
      .eq('is_default', true);

    if (clearError) {
      toast({ title: 'Could not update default method', description: clearError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error: setError } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', methodId);

    if (setError) {
      toast({ title: 'Could not update default method', description: setError.message, variant: 'destructive' });
    } else {
      setPaymentMethods((prev) => prev.map((method) => ({ ...method, isDefault: method.id === methodId })));
      toast({ title: 'Default payment method updated' });
    }

    setSaving(false);
  };

  const addMethod = async () => {
    if (!selectedMethod || !internalUserId) return;
    setSaving(true);
    const payload = {
      internal_user_id: internalUserId,
      provider: 'xendit',
      brand: selectedMethod,
      last4: selectedMethod === 'card' ? '4242' : selectedMethod === 'ach' ? '0987' : null,
      exp_month: selectedMethod === 'card' ? 12 : null,
      exp_year: selectedMethod === 'card' ? 2027 : null,
      is_default: paymentMethods.length === 0,
      is_active: true,
    };

    const { data, error } = await supabase.from('payment_methods').insert(payload).select('id, brand, last4, exp_month, exp_year, is_default').single();

    if (error) {
      toast({ title: 'Could not save payment method', description: error.message, variant: 'destructive' });
    } else {
      const type = providerToType(data.brand);
      const next: SavedPaymentMethod = {
        id: data.id,
        type,
        nickname: type === 'card' ? `${data.brand ?? 'Card'} ending ${data.last4 ?? '----'}` : type === 'ach' ? 'ACH account' : 'Payroll deduction',
        details: type === 'card' ? `${data.brand ?? 'Card'} •••• ${data.last4 ?? '----'}` : type === 'ach' ? `Bank account ending ${data.last4 ?? '----'}` : 'Payroll method',
        isDefault: !!data.is_default,
      };
      setPaymentMethods((prev) => [next, ...prev.map((method) => ({ ...method, isDefault: next.isDefault ? false : method.isDefault }))]);
      toast({ title: 'Payment method saved' });
    }
    setSaving(false);
  };

  if (!availableMethodOptions.length) return <div className="p-6 text-center text-gray-500">No payment method types are currently enabled.</div>;
  if (loading) return <div className="p-6 text-center text-gray-500">Loading payment methods...</div>;

  return <div className="mx-auto max-w-5xl space-y-6">{/* omitted unchanged UI */}
    <div className="space-y-2 text-center"><h1 className="text-3xl font-bold text-foreground">Payment Management</h1></div>
    <Card><CardContent className="space-y-4 p-6"><h2 className="text-lg font-semibold">Saved payment methods</h2>
      {paymentMethods.map((method)=>{ const methodMeta=paymentMethodOptions.find((o)=>o.value===method.type); const Icon=methodMeta?.icon??CreditCard; return <div key={method.id} className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="h-5 w-5"/></span><div><p className="font-medium text-foreground">{method.nickname}</p><p className="text-sm text-muted-foreground">{method.details}</p></div></div><div className="flex items-center gap-2">{method.isDefault?<Badge>Default</Badge>:<Button variant="outline" size="sm" disabled={saving} onClick={()=>void setDefault(method.id)}>Make default</Button>}</div></div>; })}
      {defaultMethod && <p className="text-sm text-muted-foreground">Current default method: <span className="font-medium text-foreground">{defaultMethod.nickname}</span></p>}
    </CardContent></Card>
    <div className="space-y-4"><h2 className="text-lg font-semibold">Add or update a payment method</h2>{availableMethodOptions.map((method)=>{const isSelected=selectedMethod===method.value; const Icon=method.icon; return <button key={method.value} type="button" onClick={()=>setSelectedMethod(method.value)} className={`w-full rounded-lg border bg-card p-5 text-left transition-colors ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}><div className="flex items-center gap-4"><span className={`h-5 w-5 rounded-full border border-primary ${isSelected ? 'bg-primary' : 'bg-transparent'}`}/><span className={`grid h-12 w-12 place-items-center rounded-md ${isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}><Icon className="h-6 w-6" strokeWidth={1.8}/></span><span className="flex-1"><span className="block text-base font-semibold text-foreground">{method.label}</span><span className="mt-1 block text-sm text-muted-foreground">{method.description}</span></span>{isSelected && <Check className="h-5 w-5 text-primary"/>}</div></button>;})}</div>
    <Card><CardContent className="space-y-6 p-6">{selectedMethod==='payroll'&&<PayrollForm/>}{selectedMethod==='card'&&<CardForm/>}{selectedMethod==='ach'&&<AchForm/>}<div className="flex justify-end"><Button onClick={()=>void addMethod()} disabled={saving}><Plus className="mr-2 h-4 w-4"/>Save payment method</Button></div></CardContent></Card>
  </div>;
}

function PayrollForm() { return <div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Employee ID"><Input placeholder="EMP-12345" /></Field><Field label="Pay frequency"><Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="bi-weekly">Bi-weekly</SelectItem><SelectItem value="semi-monthly">Semi-monthly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></Field></div>; }
function CardForm() { return <div className="space-y-6"><Field label="Cardholder name"><Input placeholder="Jane Doe" /></Field><Field label="Card number"><Input placeholder="1234 5678 9012 3456" /></Field><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Expiry (MM/YY)"><Input placeholder="12/27" /></Field><Field label="CVC"><Input placeholder="123" /></Field></div></div>; }
function AchForm() { return <div className="space-y-6"><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Account holder name"><Input /></Field><Field label="Bank name"><Input /></Field><Field label="Routing number"><Input placeholder="123456789" /></Field><Field label="Account number"><Input /></Field></div><label className="flex items-start gap-4"><Checkbox className="mt-0.5" /><span className="text-sm text-muted-foreground">I authorize recurring ACH debits from the account above for the agreed loan repayment schedule. I understand I can revoke this authorization in writing.</span></label></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-2"><span className="block text-sm font-medium text-foreground">{label}</span>{children}</label>; }
