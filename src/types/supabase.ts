export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      deliverable_dependencies: {
        Row: {
          deliverable_id: string
          depends_on_entity_id: string
          depends_on_entity_type: string
          id: string
        }
        Insert: {
          deliverable_id: string
          depends_on_entity_id: string
          depends_on_entity_type: string
          id?: string
        }
        Update: {
          deliverable_id?: string
          depends_on_entity_id?: string
          depends_on_entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_dependencies_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          actual_completion_date: string | null
          created_at: string | null
          description: string | null
          dod: string | null
          epic_id: string
          estimation_days: number | null
          id: string
          metadata: Json | null
          owner_id: string | null
          planned_week_end: string | null
          planned_week_start: string | null
          slip_count: number
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          created_at?: string | null
          description?: string | null
          dod?: string | null
          epic_id: string
          estimation_days?: number | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          planned_week_end?: string | null
          planned_week_start?: string | null
          slip_count?: number
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          created_at?: string | null
          description?: string | null
          dod?: string | null
          epic_id?: string
          estimation_days?: number | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          planned_week_end?: string | null
          planned_week_start?: string | null
          slip_count?: number
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          importance: number | null
          initiative_id: number
          metadata: Json | null
          owner_id: string | null
          planning_status: string
          target_date: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: number | null
          initiative_id: number
          metadata?: Json | null
          owner_id?: string | null
          planning_status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: number | null
          initiative_id?: number
          metadata?: Json | null
          owner_id?: string | null
          planning_status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "epics_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          metadata: Json | null
          objective_id: string | null
          owner_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          metadata?: Json | null
          objective_id?: string | null
          owner_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          metadata?: Json | null
          objective_id?: string | null
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiatives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          created_at: string | null
          current_value: number | null
          id: string
          objective_id: string
          target_value: number | null
          title: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          objective_id: string
          target_value?: number | null
          title: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          objective_id?: string
          target_value?: number | null
          title?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      lighthouse_items: {
        Row: {
          deliverable_id: string
          feature_lead: string | null
          feature_team: string[] | null
          id: string
          is_internal: boolean
          lighthouse_id: string
          order_index: number | null
        }
        Insert: {
          deliverable_id: string
          feature_lead?: string | null
          feature_team?: string[] | null
          id?: string
          is_internal?: boolean
          lighthouse_id: string
          order_index?: number | null
        }
        Update: {
          deliverable_id?: string
          feature_lead?: string | null
          feature_team?: string[] | null
          id?: string
          is_internal?: boolean
          lighthouse_id?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lighthouse_items_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighthouse_items_feature_lead_fkey"
            columns: ["feature_lead"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lighthouse_items_lighthouse_id_fkey"
            columns: ["lighthouse_id"]
            isOneToOne: false
            referencedRelation: "lighthouses"
            referencedColumns: ["id"]
          },
        ]
      }
      lighthouses: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          month: string
          status: string
          title: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: string
          status?: string
          title?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lighthouses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          initiative_id: number | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          initiative_id?: number | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          initiative_id?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          auth_user_id: string | null
          counts_toward_capacity: boolean
          created_at: string | null
          email: string | null
          id: string
          join_date: string | null
          leave_date: string | null
          name: string
          permission: string
          role: string | null
          team_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          counts_toward_capacity?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          join_date?: string | null
          leave_date?: string | null
          name: string
          permission?: string
          role?: string | null
          team_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          counts_toward_capacity?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          join_date?: string | null
          leave_date?: string | null
          name?: string
          permission?: string
          role?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      person_unavailability: {
        Row: {
          id: string
          person_id: string
          reason: string | null
          week_start: string
        }
        Insert: {
          id?: string
          person_id: string
          reason?: string | null
          week_start: string
        }
        Update: {
          id?: string
          person_id?: string
          reason?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_unavailability_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

