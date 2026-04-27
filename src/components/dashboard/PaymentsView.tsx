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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-foreground">Payment Methods</h1>
        <p className="text-muted-foreground">
          Choose how you want repayments to be collected for your active loan.
        </p>
      </div>

      <div className="space-y-4">
        {paymentMethodOptions.map((method) => {
          const isSelected = selectedMethod === method.value;
          const Icon = method.icon;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => setSelectedMethod(method.value)}
              className={`w-full rounded-lg border bg-card p-5 text-left transition-colors ${
                isSelected
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`h-5 w-5 rounded-full border border-primary ${
                    isSelected ? 'bg-primary' : 'bg-transparent'
                  }`}
                />

                <span
                  className={`grid h-12 w-12 place-items-center rounded-md ${
                    isSelected
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>

                <span className="flex-1">
                  <span className="block text-base font-semibold text-foreground">
                    {method.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {method.description}
                  </span>
                </span>

                {isSelected && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
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
        <Input placeholder="EMP-12345" />
      </Field>

      <Field label="Pay frequency">
        <Select>
          <SelectTrigger>
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
        <Input placeholder="Jane Doe" />
      </Field>

      <Field label="Card number">
        <Input placeholder="1234 5678 9012 3456" />
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Expiry (MM/YY)">
          <Input placeholder="12/27" />
        </Field>

        <Field label="CVC">
          <Input placeholder="123" />
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
      </div>

      <label className="flex items-start gap-4">
        <Checkbox className="mt-0.5" />
        <span className="text-sm text-muted-foreground">
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
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
