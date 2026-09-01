export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      stripe_payment_methods: {
        Row: {
          brand: string | null
          country: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          fingerprint: string | null
          funding: string | null
          id: string
          internal_user_id: string
          is_default: boolean
          mandate_id: string | null
          metadata: Json
          status: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          stripe_setup_intent_id: string | null
          three_d_secure_status: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          country?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          funding?: string | null
          id?: string
          internal_user_id: string
          is_default?: boolean
          mandate_id?: string | null
          metadata?: Json
          status?: string
          stripe_customer_id: string
          stripe_payment_method_id: string
          stripe_setup_intent_id?: string | null
          three_d_secure_status?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          country?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          funding?: string | null
          id?: string
          internal_user_id?: string
          is_default?: boolean
          mandate_id?: string | null
          metadata?: Json
          status?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          stripe_setup_intent_id?: string | null
          three_d_secure_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_agreements: {
        Row: {
          agreement_pdf_url: string | null
          audit_trail: Json
          created_at: string
          esign_contract_id: string
          esign_template_id: string | null
          id: string
          internal_user_id: string
          loan_id: string
          schedule_snapshot: Json | null
          signed_at: string | null
          signer_email: string | null
          signer_ip: string | null
          signer_name: string | null
          status: string
          stripe_payment_method_id: string | null
          template_version: string
          updated_at: string
        }
        Insert: {
          agreement_pdf_url?: string | null
          audit_trail?: Json
          created_at?: string
          esign_contract_id: string
          esign_template_id?: string | null
          id?: string
          internal_user_id: string
          loan_id: string
          schedule_snapshot?: Json | null
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          stripe_payment_method_id?: string | null
          template_version?: string
          updated_at?: string
        }
        Update: {
          agreement_pdf_url?: string | null
          audit_trail?: Json
          created_at?: string
          esign_contract_id?: string
          esign_template_id?: string | null
          id?: string
          internal_user_id?: string
          loan_id?: string
          schedule_snapshot?: Json | null
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          stripe_payment_method_id?: string | null
          template_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_attempts: {
        Row: {
          amount_centavos: number
          attempt_no: number
          attempted_at: string
          failure_code: string | null
          failure_message: string | null
          id: string
          idempotency_key: string
          loan_id: string
          payment_schedule_id: string
          settled_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
        }
        Insert: {
          amount_centavos: number
          attempt_no: number
          attempted_at?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key: string
          loan_id: string
          payment_schedule_id: string
          settled_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
        }
        Update: {
          amount_centavos?: number
          attempt_no?: number
          attempted_at?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          idempotency_key?: string
          loan_id?: string
          payment_schedule_id?: string
          settled_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string
          error: string | null
          id: string
          internal_user_id: string | null
          kind: string
          loan_id: string | null
          payload: Json
          payment_schedule_id: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          dedupe_key: string
          error?: string | null
          id?: string
          internal_user_id?: string | null
          kind: string
          loan_id?: string | null
          payload?: Json
          payment_schedule_id?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string
          error?: string | null
          id?: string
          internal_user_id?: string | null
          kind?: string
          loan_id?: string | null
          payload?: Json
          payment_schedule_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_id: string
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          source: string
        }
        Insert: {
          error?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          source: string
        }
        Update: {
          error?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string | null
          employer_name: string | null
          employment_status: string
          id: string
          job_title: string | null
          loan_amount: number
          loan_purpose: string | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_income: number
          reviewed_at: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          years_employed: number | null
        }
        Insert: {
          created_at?: string | null
          employer_name?: string | null
          employment_status: string
          id?: string
          job_title?: string | null
          loan_amount: number
          loan_purpose?: string | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_income: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          years_employed?: number | null
        }
        Update: {
          created_at?: string | null
          employer_name?: string | null
          employment_status?: string
          id?: string
          job_title?: string | null
          loan_amount?: number
          loan_purpose?: string | null
          loan_type?: Database["public"]["Enums"]["loan_type"]
          monthly_income?: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          years_employed?: number | null
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          address: string
          agreed_to_terms: boolean
          application_id: string
          city: string
          created_at: string | null
          email: string
          employer_name: string
          first_name: string
          id: number
          id_image: string
          job_title: string
          last_name: string
          loan_amount: number
          loan_purpose: string
          loan_term: number
          monthly_income: number
          phone: string
          signature: string
          state: string
          status: string
          updated_at: string | null
          years_employed: number
          zip_code: string
        }
        Insert: {
          address: string
          agreed_to_terms: boolean
          application_id: string
          city: string
          created_at?: string | null
          email: string
          employer_name: string
          first_name: string
          id?: number
          id_image: string
          job_title: string
          last_name: string
          loan_amount: number
          loan_purpose: string
          loan_term: number
          monthly_income: number
          phone: string
          signature: string
          state: string
          status: string
          updated_at?: string | null
          years_employed: number
          zip_code: string
        }
        Update: {
          address?: string
          agreed_to_terms?: boolean
          application_id?: string
          city?: string
          created_at?: string | null
          email?: string
          employer_name?: string
          first_name?: string
          id?: number
          id_image?: string
          job_title?: string
          last_name?: string
          loan_amount?: number
          loan_purpose?: string
          loan_term?: number
          monthly_income?: number
          phone?: string
          signature?: string
          state?: string
          status?: string
          updated_at?: string | null
          years_employed?: number
          zip_code?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          agreement_id: string | null
          disbursed_at: string | null
          stripe_payment_method_id: string | null
          application_id: string
          created_at: string | null
          current_balance: number
          id: string
          interest_rate: number
          loan_type: Database["public"]["Enums"]["loan_type"]
          maturity_date: string | null
          monthly_payment: number
          origination_date: string | null
          principal_amount: number
          status: Database["public"]["Enums"]["loan_status"] | null
          term_months: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agreement_id?: string | null
          disbursed_at?: string | null
          stripe_payment_method_id?: string | null
          application_id: string
          created_at?: string | null
          current_balance: number
          id?: string
          interest_rate: number
          loan_type: Database["public"]["Enums"]["loan_type"]
          maturity_date?: string | null
          monthly_payment: number
          origination_date?: string | null
          principal_amount: number
          status?: Database["public"]["Enums"]["loan_status"] | null
          term_months: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agreement_id?: string | null
          disbursed_at?: string | null
          stripe_payment_method_id?: string | null
          application_id?: string
          created_at?: string | null
          current_balance?: number
          id?: string
          interest_rate?: number
          loan_type?: Database["public"]["Enums"]["loan_type"]
          maturity_date?: string | null
          monthly_payment?: number
          origination_date?: string | null
          principal_amount?: number
          status?: Database["public"]["Enums"]["loan_status"] | null
          term_months?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      names: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          amount_due_centavos: number
          attempt_count: number
          collection_state: string
          last_error: string | null
          next_attempt_at: string | null
          amount_due: number
          created_at: string | null
          due_date: string
          id: string
          interest_amount: number
          loan_id: string
          paid_amount: number | null
          paid_date: string | null
          payment_number: number
          principal_amount: number
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_due_centavos?: number
          attempt_count?: number
          collection_state?: string
          last_error?: string | null
          next_attempt_at?: string | null
          amount_due: number
          created_at?: string | null
          due_date: string
          id?: string
          interest_amount: number
          loan_id: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_number: number
          principal_amount: number
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_due_centavos?: number
          attempt_count?: number
          collection_state?: string
          last_error?: string | null
          next_attempt_at?: string | null
          amount_due?: number
          created_at?: string | null
          due_date?: string
          id?: string
          interest_amount?: number
          loan_id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_number?: number
          principal_amount?: number
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          amount: number
          created_at: string | null
          id: string
          loan_id: string
          payment_date: string
          payment_method: string | null
          payment_schedule_id: string | null
          transaction_id: string | null
        }
        Insert: {
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          amount: number
          created_at?: string | null
          id?: string
          loan_id: string
          payment_date?: string
          payment_method?: string | null
          payment_schedule_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          loan_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_schedule_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      alternative_payment_methods: {
        Row: {
          bank: string | null
          brand: string | null
          card_type: string | null
          channel_code: string
          country: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          fingerprint: string | null
          id: string
          internal_user_id: string
          is_active: boolean
          is_default: boolean
          last4: string | null
          metadata: Json
          payment_type: string
          provider: string
          provider_customer_id: string | null
          provider_reference_id: string | null
          provider_token_id: string
          token_status: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          bank?: string | null
          brand?: string | null
          card_type?: string | null
          channel_code?: string
          country?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          id?: string
          internal_user_id: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          metadata?: Json
          payment_type?: string
          provider?: string
          provider_customer_id?: string | null
          provider_reference_id?: string | null
          provider_token_id: string
          token_status?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          bank?: string | null
          brand?: string | null
          card_type?: string | null
          channel_code?: string
          country?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          fingerprint?: string | null
          id?: string
          internal_user_id?: string
          is_active?: boolean
          is_default?: boolean
          last4?: string | null
          metadata?: Json
          payment_type?: string
          provider?: string
          provider_customer_id?: string | null
          provider_reference_id?: string | null
          provider_token_id?: string
          token_status?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alternative_payment_methods_internal_user_id_fkey"
            columns: ["internal_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          body: string
          created_at: string
          cta_label: string | null
          cta_view: string | null
          expires_at: string | null
          id: string
          published_at: string
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          cta_label?: string | null
          cta_view?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_view?: string | null
          expires_at?: string | null
          id?: string
          published_at?: string
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string
          employer_address: string | null
          employer_name: string | null
          employer_phone: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          position: string | null
          state: string | null
          updated_at: string | null
          years_employed: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          position?: string | null
          state?: string | null
          updated_at?: string | null
          years_employed?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          employer_address?: string | null
          employer_name?: string | null
          employer_phone?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          position?: string | null
          state?: string | null
          updated_at?: string | null
          years_employed?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      due_collections: {
        Row: {
          amount_due_centavos: number | null
          attempt_count: number | null
          borrower_email: string | null
          collection_state: string | null
          due_date: string | null
          first_name: string | null
          internal_user_id: string | null
          last_name: string | null
          loan_id: string | null
          payment_number: number | null
          payment_schedule_id: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_payment_method_row_id: string | null
        }
        Relationships: []
      }
      upcoming_debits: {
        Row: {
          amount_due_centavos: number | null
          borrower_email: string | null
          brand: string | null
          due_date: string | null
          first_name: string | null
          internal_user_id: string | null
          last4: string | null
          loan_id: string | null
          payment_number: number | null
          payment_schedule_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
      loan_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "paid_off"
        | "defaulted"
      loan_type: "personal" | "auto" | "home"
      payment_status: "pending" | "paid" | "overdue" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      loan_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "paid_off",
        "defaulted",
      ],
      loan_type: ["personal", "auto", "home"],
      payment_status: ["pending", "paid", "overdue", "failed"],
    },
  },
} as const
