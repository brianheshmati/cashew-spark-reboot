import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleLine {
  payment_number: number;
  due_date: string;
  amount_due_centavos: number;
}

interface StripeCardSetupProps {
  /** Loan the mandate will be attached to. */
  loanId?: string;
  /**
   * The schedule the borrower is authorizing. Shown in full before consent --
   * a borrower who never saw the dates and amounts did not agree to them.
   */
  schedule?: ScheduleLine[];
  onAuthorized?: (setupIntentId: string) => void;
}

const peso = (centavos: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(centavos / 100);

const CardSetupForm = ({
  schedule,
  onAuthorized,
}: {
  schedule?: ScheduleLine[];
  onAuthorized?: (id: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => (schedule ?? []).reduce((sum, l) => sum + l.amount_due_centavos, 0),
    [schedule],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    if (!consented) {
      setError('Please authorize the scheduled charges to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Confirms the SetupIntent and runs 3DS. Card data goes straight from the
    // iframe to Stripe -- it never reaches our servers or database.
    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-callback`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Could not authorize this card.');
      setSubmitting(false);
      return;
    }

    if (setupIntent?.status === 'succeeded') {
      // The stripe-webhook writes the payment method row. Don't write it here:
      // a client that lies or a tab that closes would desync the ledger.
      toast({
        title: 'Card authorized',
        description: 'Your card is authorized for the scheduled repayments.',
      });
      onAuthorized?.(setupIntent.id);
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {schedule && schedule.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium">
            You are authorizing these charges
          </p>
          <table className="w-full text-sm">
            <tbody>
              {schedule.map((line) => (
                <tr key={line.payment_number} className="border-b last:border-0">
                  <td className="py-1.5 text-muted-foreground">
                    Payment {line.payment_number}
                  </td>
                  <td className="py-1.5">{line.due_date}</td>
                  <td className="py-1.5 text-right font-medium">
                    {peso(line.amount_due_centavos)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 font-medium" colSpan={2}>
                  Total
                </td>
                <td className="pt-2 text-right font-semibold">{peso(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="mandate-consent"
          checked={consented}
          onCheckedChange={(value) => setConsented(value === true)}
          className="mt-0.5"
        />
        <label
          htmlFor="mandate-consent"
          className="text-sm leading-relaxed cursor-pointer"
        >
          I authorize Cashew Solutions to automatically charge this card on the
          dates and in the amounts shown above, and for any late charges properly
          due under my loan agreement. I understand I will be emailed 3 days
          before each charge, and that revoking this authorization does not
          cancel the debt.
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Card details are sent directly to Stripe. Cashew never stores your card
        number.
      </div>

      <Button
        type="submit"
        disabled={!stripe || submitting || !consented}
        className="w-full"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Authorize card
      </Button>
    </form>
  );
};

export const StripeCardSetup = ({
  loanId,
  schedule,
  onAuthorized,
}: StripeCardSetupProps) => {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const createIntent = async () => {
      const { data, error } = await supabase.functions.invoke(
        'stripe-setup-intent',
        { body: { loan_id: loanId ?? null } },
      );

      if (cancelled) return;

      if (error || !data?.client_secret) {
        toast({
          title: 'Could not start card setup',
          description: error?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setClientSecret(data.client_secret);
      setPublishableKey(
        data.publishable_key ?? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? null,
      );
      setLoading(false);
    };

    createIntent();

    return () => {
      cancelled = true;
    };
  }, [loanId, toast]);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Card setup is unavailable right now. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <CardSetupForm schedule={schedule} onAuthorized={onAuthorized} />
    </Elements>
  );
};

export default StripeCardSetup;
