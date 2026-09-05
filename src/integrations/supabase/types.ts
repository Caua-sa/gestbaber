export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber: string
          barber_id: string | null
          barbershop_id: string | null
          confirmation_sent_at: string | null
          created_at: string
          id: string
          notes: string | null
          owner_id: string | null
          price: number
          reminder_1h_sent_at: string | null
          reminder_sent_at: string | null
          service: string
          status: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber: string
          barber_id?: string | null
          barbershop_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          price?: number
          reminder_1h_sent_at?: string | null
          reminder_sent_at?: string | null
          service: string
          status?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber?: string
          barber_id?: string | null
          barbershop_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          price?: number
          reminder_1h_sent_at?: string | null
          reminder_sent_at?: string | null
          service?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          active: boolean
          barbershop_id: string | null
          commission_pct: number
          created_at: string
          id: string
          name: string
          owner_id: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          name: string
          owner_id: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      barbershops: {
        Row: {
          active: boolean
          address: string | null
          banned: boolean
          birthday_discount_percent: number
          created_at: string
          description: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          map_embed_url: string | null
          name: string
          owner_id: string
          phone: string | null
          photos: Json
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          banned?: boolean
          birthday_discount_percent?: number
          created_at?: string
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          map_embed_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          photos?: Json
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          banned?: boolean
          birthday_discount_percent?: number
          created_at?: string
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          map_embed_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          photos?: Json
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      insumos: {
        Row: {
          active: boolean
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          name: string
          notes: string | null
          owner_id: string
          stock: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          notes?: string | null
          owner_id: string
          stock?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          notes?: string | null
          owner_id?: string
          stock?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_settings: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          key: string
          section: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          key: string
          section: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          key?: string
          section?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      marketing_media: {
        Row: {
          active: boolean
          barbershop_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          link_url: string | null
          media_type: string
          media_url: string
          owner_id: string
          sort_order: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          link_url?: string | null
          media_type: string
          media_url: string
          owner_id: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          link_url?: string | null
          media_type?: string
          media_url?: string
          owner_id?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_media_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_payments: {
        Row: {
          admin_user_id: string
          amount: number
          created_at: string
          description: string | null
          id: string
          init_point: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          payer_user_id: string | null
          raw: Json | null
          reference_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_user_id?: string | null
          raw?: Json | null
          reference_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_user_id?: string | null
          raw?: Json | null
          reference_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mp_recurring_plans: {
        Row: {
          admin_user_id: string
          amount: number
          created_at: string
          currency_id: string
          frequency: number
          frequency_type: string
          id: string
          init_point: string | null
          mp_preapproval_plan_id: string
          plan_id: string | null
          raw: Json | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          amount: number
          created_at?: string
          currency_id?: string
          frequency?: number
          frequency_type?: string
          id?: string
          init_point?: string | null
          mp_preapproval_plan_id: string
          plan_id?: string | null
          raw?: Json | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          amount?: number
          created_at?: string
          currency_id?: string
          frequency?: number
          frequency_type?: string
          id?: string
          init_point?: string | null
          mp_preapproval_plan_id?: string
          plan_id?: string | null
          raw?: Json | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mp_settings: {
        Row: {
          access_token: string
          active: boolean
          created_at: string
          id: string
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          active?: boolean
          created_at?: string
          id?: string
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          active?: boolean
          created_at?: string
          id?: string
          public_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_subscriptions: {
        Row: {
          admin_user_id: string
          amount: number
          created_at: string
          id: string
          init_point: string | null
          mp_preapproval_id: string
          next_payment_date: string | null
          plan_id: string | null
          raw: Json | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_user_id: string
          amount: number
          created_at?: string
          id?: string
          init_point?: string | null
          mp_preapproval_id: string
          next_payment_date?: string | null
          plan_id?: string | null
          raw?: Json | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_user_id?: string
          amount?: number
          created_at?: string
          id?: string
          init_point?: string | null
          mp_preapproval_id?: string
          next_payment_date?: string | null
          plan_id?: string | null
          raw?: Json | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          level: string
          target_owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          target_owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          target_owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          mp_payment_id: string | null
          owner_id: string | null
          product_id: string
          quantity: number
          status: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          owner_id?: string | null
          product_id: string
          quantity?: number
          status?: string
          total: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          owner_id?: string | null
          product_id?: string
          quantity?: number
          status?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          barbershop_id: string | null
          created_at: string
          features: Json
          id: string
          name: string
          owner_id: string | null
          period: string
          popular: boolean
          price: number
        }
        Insert: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          features?: Json
          id?: string
          name: string
          owner_id?: string | null
          period?: string
          popular?: boolean
          price: number
        }
        Update: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          features?: Json
          id?: string
          name?: string
          owner_id?: string | null
          period?: string
          popular?: boolean
          price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          name: string
          owner_id: string | null
          sell_price: number
          sold: number
          stock: number
          updated_at: string
          visible_on_site: boolean
        }
        Insert: {
          active?: boolean
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          owner_id?: string | null
          sell_price?: number
          sold?: number
          stock?: number
          updated_at?: string
          visible_on_site?: boolean
        }
        Update: {
          active?: boolean
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          owner_id?: string | null
          sell_price?: number
          sold?: number
          stock?: number
          updated_at?: string
          visible_on_site?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday: string | null
          birthday_greeted_year: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          birthday_greeted_year?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          birthday_greeted_year?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          barbershop_id: string | null
          created_at: string
          duration_min: number
          id: string
          name: string
          owner_id: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          name: string
          owner_id: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          name?: string
          owner_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      signup_otps: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          full_name: string | null
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          barbershop_id: string | null
          cancel_mode: string | null
          canceled_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          renewal_notified_at: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          cancel_mode?: string | null
          canceled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          renewal_notified_at?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          cancel_mode?: string | null
          canceled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          renewal_notified_at?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          owner_id: string | null
          transaction_date: string
          type: string
          value: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          transaction_date?: string
          type?: string
          value?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          transaction_date?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          context: Json
          created_at: string
          escalated: boolean
          id: string
          last_message_at: string
          owner_id: string
          phone: string
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          escalated?: boolean
          id?: string
          last_message_at?: string
          owner_id: string
          phone: string
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          escalated?: boolean
          id?: string
          last_message_at?: string
          owner_id?: string
          phone?: string
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          owner_id: string
          phone: string
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          id?: string
          owner_id: string
          phone: string
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          owner_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token: string | null
          baileys_status: string | null
          baileys_token: string | null
          baileys_url: string | null
          birthday_discount_percent: number
          birthday_enabled: boolean | null
          birthday_valid_days: number
          bot_enabled: boolean | null
          business_account_id: string | null
          confirmation_enabled: boolean | null
          created_at: string
          display_number: string | null
          expiration_enabled: boolean | null
          expiration_lead_days: number | null
          id: string
          mode: string
          owner_id: string
          phone_number_id: string | null
          reminder_1h_enabled: boolean
          reminder_enabled: boolean | null
          reminder_lead_hours: number | null
          template_birthday: string | null
          template_confirmation: string | null
          template_expiration: string | null
          template_reminder: string | null
          template_reminder_1h: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          baileys_status?: string | null
          baileys_token?: string | null
          baileys_url?: string | null
          birthday_discount_percent?: number
          birthday_enabled?: boolean | null
          birthday_valid_days?: number
          bot_enabled?: boolean | null
          business_account_id?: string | null
          confirmation_enabled?: boolean | null
          created_at?: string
          display_number?: string | null
          expiration_enabled?: boolean | null
          expiration_lead_days?: number | null
          id?: string
          mode?: string
          owner_id: string
          phone_number_id?: string | null
          reminder_1h_enabled?: boolean
          reminder_enabled?: boolean | null
          reminder_lead_hours?: number | null
          template_birthday?: string | null
          template_confirmation?: string | null
          template_expiration?: string | null
          template_reminder?: string | null
          template_reminder_1h?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          baileys_status?: string | null
          baileys_token?: string | null
          baileys_url?: string | null
          birthday_discount_percent?: number
          birthday_enabled?: boolean | null
          birthday_valid_days?: number
          bot_enabled?: boolean | null
          business_account_id?: string | null
          confirmation_enabled?: boolean | null
          created_at?: string
          display_number?: string | null
          expiration_enabled?: boolean | null
          expiration_lead_days?: number | null
          id?: string
          mode?: string
          owner_id?: string
          phone_number_id?: string | null
          reminder_1h_enabled?: boolean
          reminder_enabled?: boolean | null
          reminder_lead_hours?: number | null
          template_birthday?: string | null
          template_confirmation?: string | null
          template_expiration?: string | null
          template_reminder?: string | null
          template_reminder_1h?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      tv_agenda_slots: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          barber_id: string | null
          barbershop_id: string | null
          status: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          barber_id?: string | null
          barbershop_id?: string | null
          status?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          barber_id?: string | null
          barbershop_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_account_owner: { Args: { _user_id: string }; Returns: string }
      has_birthday_today: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "superadmin"],
    },
  },
} as const
