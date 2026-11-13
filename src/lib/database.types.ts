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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      challenges: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          source_filename: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id?: string
          source_filename: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          source_filename?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ideas: {
        Row: {
          author_first_name: string | null
          author_last_name: string | null
          budget_eur: number | null
          budget_raw: string | null
          challenge_id: string
          content_key: string | null
          created_at: string | null
          description: string
          direction: string | null
          duplicate_of: string | null
          expected_benefits: string | null
          external_id: string
          id: string
          shortlist_rank: number | null
          shortlisted: boolean
          site: string | null
          status: Database["public"]["Enums"]["idea_status"]
          submitted_on: string | null
          submitted_on_raw: string | null
          theme: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_first_name?: string | null
          author_last_name?: string | null
          budget_eur?: number | null
          budget_raw?: string | null
          challenge_id: string
          content_key?: string | null
          created_at?: string | null
          description: string
          direction?: string | null
          duplicate_of?: string | null
          expected_benefits?: string | null
          external_id: string
          id?: string
          shortlist_rank?: number | null
          shortlisted?: boolean
          site?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          submitted_on?: string | null
          submitted_on_raw?: string | null
          theme?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_first_name?: string | null
          author_last_name?: string | null
          budget_eur?: number | null
          budget_raw?: string | null
          challenge_id?: string
          content_key?: string | null
          created_at?: string | null
          description?: string
          direction?: string | null
          duplicate_of?: string | null
          expected_benefits?: string | null
          external_id?: string
          id?: string
          shortlist_rank?: number | null
          shortlisted?: boolean
          site?: string | null
          status?: Database["public"]["Enums"]["idea_status"]
          submitted_on?: string | null
          submitted_on_raw?: string | null
          theme?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          ai_generated_at: string | null
          ai_justification: string | null
          ai_model: string | null
          ai_score: number | null
          criterion: Database["public"]["Enums"]["criterion"]
          final_justification: string | null
          final_score: number | null
          id: string
          idea_id: string
          updated_at: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_justification?: string | null
          ai_model?: string | null
          ai_score?: number | null
          criterion: Database["public"]["Enums"]["criterion"]
          final_justification?: string | null
          final_score?: number | null
          id?: string
          idea_id: string
          updated_at?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_justification?: string | null
          ai_model?: string | null
          ai_score?: number | null
          criterion?: Database["public"]["Enums"]["criterion"]
          final_justification?: string | null
          final_score?: number | null
          id?: string
          idea_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      idea_averages: {
        Row: {
          ai_average: number | null
          final_average: number | null
          idea_id: string | null
          scored_criteria_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      flag_exact_duplicates: {
        Args: { p_challenge_id: string }
        Returns: number
      }
    }
    Enums: {
      criterion: "impact" | "feasibility" | "alignment" | "innovation"
      idea_status: "new" | "ai_scored" | "reviewed" | "duplicate"
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
      criterion: ["impact", "feasibility", "alignment", "innovation"],
      idea_status: ["new", "ai_scored", "reviewed", "duplicate"],
    },
  },
} as const
