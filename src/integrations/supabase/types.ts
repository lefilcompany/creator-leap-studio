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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          approved: boolean | null
          brand_id: string
          created_at: string | null
          details: Json | null
          id: string
          result: Json | null
          revisions: number | null
          status: string
          team_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          brand_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          result?: Json | null
          revisions?: number | null
          status?: string
          team_id: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean | null
          brand_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          result?: Json | null
          revisions?: number | null
          status?: string
          team_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_references: string | null
          collaborations: string | null
          color_palette: Json | null
          created_at: string | null
          crisis_info: string | null
          goals: string | null
          id: string
          inspirations: string | null
          keywords: string | null
          logo: Json | null
          milestones: string | null
          moodboard: Json | null
          name: string
          promise: string | null
          reference_image: Json | null
          responsible: string
          restrictions: string | null
          segment: string
          special_dates: string | null
          success_metrics: string | null
          team_id: string
          updated_at: string | null
          user_id: string
          values: string | null
        }
        Insert: {
          brand_references?: string | null
          collaborations?: string | null
          color_palette?: Json | null
          created_at?: string | null
          crisis_info?: string | null
          goals?: string | null
          id?: string
          inspirations?: string | null
          keywords?: string | null
          logo?: Json | null
          milestones?: string | null
          moodboard?: Json | null
          name: string
          promise?: string | null
          reference_image?: Json | null
          responsible: string
          restrictions?: string | null
          segment: string
          special_dates?: string | null
          success_metrics?: string | null
          team_id: string
          updated_at?: string | null
          user_id: string
          values?: string | null
        }
        Update: {
          brand_references?: string | null
          collaborations?: string | null
          color_palette?: Json | null
          created_at?: string | null
          crisis_info?: string | null
          goals?: string | null
          id?: string
          inspirations?: string | null
          keywords?: string | null
          logo?: Json | null
          milestones?: string | null
          moodboard?: Json | null
          name?: string
          promise?: string | null
          reference_image?: Json | null
          responsible?: string
          restrictions?: string | null
          segment?: string
          special_dates?: string | null
          success_metrics?: string | null
          team_id?: string
          updated_at?: string | null
          user_id?: string
          values?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean
          team_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          team_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          age: string
          beliefs_and_interests: string
          brand_id: string
          challenges: string
          content_consumption_routine: string
          created_at: string | null
          gender: string
          id: string
          interest_triggers: string
          location: string
          main_goal: string
          name: string
          preferred_tone_of_voice: string
          professional_context: string
          purchase_journey_stage: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age: string
          beliefs_and_interests: string
          brand_id: string
          challenges: string
          content_consumption_routine: string
          created_at?: string | null
          gender: string
          id?: string
          interest_triggers: string
          location: string
          main_goal: string
          name: string
          preferred_tone_of_voice: string
          professional_context: string
          purchase_journey_stage: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: string
          beliefs_and_interests?: string
          brand_id?: string
          challenges?: string
          content_consumption_routine?: string
          created_at?: string | null
          gender?: string
          id?: string
          interest_triggers?: string
          location?: string
          main_goal?: string
          name?: string
          preferred_tone_of_voice?: string
          professional_context?: string
          purchase_journey_stage?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          can_subscribe_online: boolean | null
          created_at: string | null
          credits_plans: number
          credits_quick_content: number
          credits_reviews: number
          credits_suggestions: number
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_brands: number
          max_members: number
          max_personas: number
          max_strategic_themes: number
          name: string
          price_monthly: number
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          trial_days: number
          updated_at: string | null
        }
        Insert: {
          can_subscribe_online?: boolean | null
          created_at?: string | null
          credits_plans?: number
          credits_quick_content?: number
          credits_reviews?: number
          credits_suggestions?: number
          description?: string | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          max_brands?: number
          max_members?: number
          max_personas?: number
          max_strategic_themes?: number
          name: string
          price_monthly: number
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string | null
        }
        Update: {
          can_subscribe_online?: boolean | null
          created_at?: string | null
          credits_plans?: number
          credits_quick_content?: number
          credits_reviews?: number
          credits_suggestions?: number
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_brands?: number
          max_members?: number
          max_personas?: number
          max_strategic_themes?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strategic_themes: {
        Row: {
          additional_info: string | null
          best_formats: string
          brand_id: string
          color_palette: string
          content_format: string
          created_at: string | null
          description: string
          expected_action: string
          hashtags: string
          id: string
          macro_themes: string
          objectives: string
          platforms: string
          target_audience: string
          team_id: string
          title: string
          tone_of_voice: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          best_formats: string
          brand_id: string
          color_palette: string
          content_format: string
          created_at?: string | null
          description: string
          expected_action: string
          hashtags: string
          id?: string
          macro_themes: string
          objectives: string
          platforms: string
          target_audience: string
          team_id: string
          title: string
          tone_of_voice: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: string | null
          best_formats?: string
          brand_id?: string
          color_palette?: string
          content_format?: string
          created_at?: string | null
          description?: string
          expected_action?: string
          hashtags?: string
          id?: string
          macro_themes?: string
          objectives?: string
          platforms?: string
          target_audience?: string
          team_id?: string
          title?: string
          tone_of_voice?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_themes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_themes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          admin_id: string
          code: string | null
          created_at: string | null
          credits_plans: number | null
          credits_quick_content: number | null
          credits_reviews: number | null
          credits_suggestions: number | null
          id: string
          name: string
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period_end: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          code?: string | null
          created_at?: string | null
          credits_plans?: number | null
          credits_quick_content?: number | null
          credits_reviews?: number | null
          credits_suggestions?: number | null
          id?: string
          name: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          code?: string | null
          created_at?: string | null
          credits_plans?: number | null
          credits_quick_content?: number | null
          credits_reviews?: number | null
          credits_suggestions?: number | null
          id?: string
          name?: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
