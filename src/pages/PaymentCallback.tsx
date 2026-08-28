import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'checking' | 'succeeded' | 'processing' | 'failed';

/**
 * Return target for Stripe's 3DS redirect during card setup.
 *
 * This page only reports status to the borrower. The payment method row is
 * written by the stripe-webhook function -- a borrower who closes this tab
 * mid-redirect must still end up with an authorized mandate.
 */
const PaymentCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('Confirming your card authorization…');

  useEffect(() => {
    const clientSecret = params.get('setup_intent_client_secret');
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!clientSecret || !publishableKey) {
      setStatus('failed');
      setMessage('This authorization link is missing or has expired.');
      return;
    }

    let cancelled = false;

    const check = async () => {
      const stripe = await loadStripe(publishableKey);
      if (!stripe || cancelled) return;

      const { setupIntent, error } = await stripe.retrieveSetupIntent(clientSecret);
      if (cancelled) return;

      if (error || !setupIntent) {
        setStatus('failed');
        setMessage(error?.message ?? 'We could not confirm this card.');
        return;
      }

      switch (setupIntent.status) {
        case 'succeeded':
          setStatus('succeeded');
          setMessage(
            'Your card is authorized. We will charge it on the dates in your loan agreement, and email you 3 days before each charge.',
          );
          break;
        case 'processing':
          setStatus('processing');
          setMessage('Your bank is still processing this authorization.');
          break;
        default:
          setStatus('failed');
          setMessage(
            'The card was not authorized. Please try again or use a different card.',
          );
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const Icon =
    status === 'succeeded' ? CheckCircle2 : status === 'failed' ? XCircle : Loader2;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-8 text-center">
        <Icon
          className={`mx-auto mb-4 h-10 w-10 ${
            status === 'succeeded'
              ? 'text-green-600'
              : status === 'failed'
                ? 'text-destructive'
                : 'animate-spin text-muted-foreground'
          }`}
        />
        <h1 className="mb-2 text-lg font-semibold">
          {status === 'succeeded'
            ? 'Card authorized'
            : status === 'failed'
              ? 'Authorization failed'
              : 'Confirming…'}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        {status !== 'checking' && (
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Back to dashboard
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
