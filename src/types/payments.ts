// src/types/payments.ts

export type PaymentProvider = 'stripe';

export interface PaymentMethod {
  id: string;
  internal_user_id: string;

  provider: PaymentProvider;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  stripe_setup_intent_id: string | null;

  /** Mandate reference from the SetupIntent. Evidence for off-session charges. */
  mandate_id: string | null;

  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  funding: string | null;

  status: 'pending' | 'authorized' | 'failed' | 'revoked' | 'expired';
  is_default: boolean;

  created_at: string;
}

export interface SetupIntentResponse {
  client_secret: string;
  setup_intent_id: string;
  customer_id: string;
  publishable_key: string | null;
}

export type CollectionState =
  | 'scheduled'
  | 'in_flight'
  | 'collected'
  | 'retrying'
  | 'arrears'
  | 'manual'
  | 'waived';

export interface ScheduledInstallment {
  id: string;
  loan_id: string;
  payment_number: number;
  due_date: string;
  /** Frozen at schedule generation. Never recompute this from `amount_due`. */
  amount_due_centavos: number;
  amount_due: number;
  paid_amount: number | null;
  collection_state: CollectionState;
  attempt_count: number;
  next_attempt_at: string | null;
  last_error: string | null;
}

export interface LoanAgreement {
  id: string;
  loan_id: string;
  esign_contract_id: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';
  signer_name: string | null;
  signer_email: string | null;
  signed_at: string | null;
  agreement_pdf_url: string | null;
}
