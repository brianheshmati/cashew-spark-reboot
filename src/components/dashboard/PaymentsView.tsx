import { useState, type ReactNode } from 'react';
import {
  BriefcaseBusiness,
  Check,
  CreditCard,
  Landmark,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FEATURES } from '@/config/features';

type PaymentMethod = 'payroll' | 'card' | 'ach';

const paymentMethodOptions: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}[] = [
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
];

export default function PaymentsView() {
  if (!FEATURES.paymentMethods) {
    return (
      <div className="p-6 text-center text-gray-500">
        Payment Methods feature is not enabled.
      </div>
    );
  }

  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>('payroll');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Payment Methods
      </h1>

      <div className="space-y-4">
        {paymentMethodOptions.map((method) => {
          const isSelected = selectedMethod === method.value;
          const Icon = method.icon;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => setSelectedMethod(method.value)}
              className={`w-full rounded-[22px] border bg-[#ECEFF3] p-6 text-left transition-colors ${
                isSelected
                  ? 'border-[#F0A500] shadow-[inset_0_0_0_1px_#F0A500]'
                  : 'border-[#D4D9DF]'
              }`}
            >
              <div className="flex items-center gap-5">
                <span
                  className={`h-7 w-7 rounded-full border border-[#F0A500] ${
                    isSelected ? 'bg-[#F0A500]' : 'bg-transparent'
                  }`}
                />

                <span
                  className={`grid h-20 w-20 place-items-center rounded-3xl ${
                    isSelected
                      ? 'bg-[#F4B51B] text-slate-950'
                      : 'bg-[#E2E6EB] text-slate-500'
                  }`}
                >
                  <Icon className="h-10 w-10" strokeWidth={1.8} />
                </span>

                <span className="flex-1">
                  <span className="block text-3xl leading-tight font-semibold text-slate-900">
                    {method.label}
                  </span>
                  <span className="mt-1 block text-2xl text-slate-500">
                    {method.description}
                  </span>
                </span>

                {isSelected && (
                  <Check className="h-9 w-9 text-[#F0A500]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="rounded-[22px] border-[#D4D9DF] bg-[#ECEFF3] shadow-none">
        <CardContent className="space-y-6 p-6 md:p-8">
          {selectedMethod === 'payroll' && <PayrollForm />}
          {selectedMethod === 'card' && <CardForm />}
          {selectedMethod === 'ach' && <AchForm />}
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollForm() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label="Employee ID">
        <Input placeholder="EMP-12345" className="h-14 text-3xl" />
      </Field>

      <Field label="Pay frequency">
        <Select>
          <SelectTrigger className="h-14 text-3xl">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
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

function CardForm() {
  return (
    <div className="space-y-6">
      <Field label="Cardholder name">
        <Input placeholder="Jane Doe" className="h-14 text-3xl" />
      </Field>

      <Field label="Card number">
        <Input
          placeholder="1234 5678 9012 3456"
          className="h-14 text-3xl"
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Expiry (MM/YY)">
          <Input placeholder="12/27" className="h-14 text-3xl" />
        </Field>

        <Field label="CVC">
          <Input placeholder="123" className="h-14 text-3xl" />
        </Field>
      </div>
    </div>
  );
}

function AchForm() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Account holder name">
          <Input className="h-14 text-3xl" />
        </Field>

        <Field label="Bank name">
          <Input className="h-14 text-3xl" />
        </Field>

        <Field label="Routing number">
          <Input placeholder="123456789" className="h-14 text-3xl" />
        </Field>

        <Field label="Account number">
          <Input className="h-14 text-3xl" />
        </Field>
      </div>

      <label className="flex items-start gap-4">
        <Checkbox className="mt-1 h-8 w-8 rounded-full border-[#F0A500]" />
        <span className="text-3xl text-slate-500">
          I authorize recurring ACH debits from the account above
          for the agreed loan repayment schedule. I understand I can
          revoke this authorization in writing.
        </span>
      </label>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2.5">
      <span className="block text-2xl font-semibold text-slate-900">
        {label}
      </span>
      {children}
    </label>
  );
}
