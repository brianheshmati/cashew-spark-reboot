export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
