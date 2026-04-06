// src/types/payments.ts

export type PaymentProvider = 'xendit';

export interface PaymentMethod {
  id: string;
  internal_user_id: string;

  provider: PaymentProvider;
  provider_token_id: string;

  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;

  is_default: boolean;
  is_active: boolean;

  created_at: string;
}

export interface AddCardRequest {
  token_id: string;
  user_id: string;
}

export interface ChargeRequest {
  payment_method_id: string;
  amount: number;
  loan_id: string;
  payment_schedule_id: string;
}