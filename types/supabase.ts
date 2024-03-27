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
      data_cleaning_job_validated: {
        Row: {
          code: string
          created_at: string
          data_cleaning_job_id: string
          mode: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types: string[]
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          data_cleaning_job_id: string
          mode: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types: string[]
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          data_cleaning_job_id?: string
          mode?: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence?: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_cleaning_job_validated_data_cleaning_job_id_fkey"
            columns: ["data_cleaning_job_id"]
            isOneToOne: true
            referencedRelation: "data_cleaning_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_cleaning_job_validated_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_cleaning_jobs: {
        Row: {
          code: string
          created_at: string
          id: string
          last_execution: string | null
          mode: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types: string[]
          title: string
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          last_execution?: string | null
          mode: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types: string[]
          title: string
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          last_execution?: string | null
          mode?: Database["public"]["Enums"]["data_cleaning_jobs_mode"]
          recurrence?: Database["public"]["Enums"]["data_cleaning_jobs_recurrence"]
          target_item_types?: string[]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_cleaning_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dup_stack_items: {
        Row: {
          created_at: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          item_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          item_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dup_type?: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id?: string
          item_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dup_stack_items_dup_stacks_id_fkey"
            columns: ["dupstack_id"]
            isOneToOne: false
            referencedRelation: "dup_stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dup_stacks: {
        Row: {
          created_at: string
          id: string
          item_type: Database["public"]["Enums"]["dup_stack_item_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: Database["public"]["Enums"]["dup_stack_item_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: Database["public"]["Enums"]["dup_stack_item_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dup_stacks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          distant_id: string
          dup_checked: boolean
          filled_score: number
          id: string
          item_type: Database["public"]["Enums"]["dup_stack_item_type"]
          merged_at: string | null
          merged_in_distant_id: string | null
          similarity_checked: boolean
          value: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          distant_id: string
          dup_checked: boolean
          filled_score: number
          id?: string
          item_type: Database["public"]["Enums"]["dup_stack_item_type"]
          merged_at?: string | null
          merged_in_distant_id?: string | null
          similarity_checked: boolean
          value: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          distant_id?: string
          dup_checked?: boolean
          filled_score?: number
          id?: string
          item_type?: Database["public"]["Enums"]["dup_stack_item_type"]
          merged_at?: string | null
          merged_in_distant_id?: string | null
          similarity_checked?: boolean
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      similarities: {
        Row: {
          created_at: string
          field_type: string
          id: string
          item_a_id: string
          item_a_value: string
          item_b_id: string
          item_b_value: string
          similarity_score: Database["public"]["Enums"]["similarities_similarity_score"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          field_type: string
          id?: string
          item_a_id: string
          item_a_value: string
          item_b_id: string
          item_b_value: string
          similarity_score: Database["public"]["Enums"]["similarities_similarity_score"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          item_a_id?: string
          item_a_value?: string
          item_b_id?: string
          item_b_value?: string
          similarity_score?: Database["public"]["Enums"]["similarities_similarity_score"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "similarities_item_a_id_fkey"
            columns: ["item_a_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "similarities_item_b_id_fkey"
            columns: ["item_b_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "similarities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_item_id: string | null
          sub_custom_type:
            | Database["public"]["Enums"]["workspace_subscriptions_custom_type"]
            | null
          sub_type: Database["public"]["Enums"]["workspace_subscriptions_type"]
          workspace_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          sub_custom_type?:
            | Database["public"]["Enums"]["workspace_subscriptions_custom_type"]
            | null
          sub_type: Database["public"]["Enums"]["workspace_subscriptions_type"]
          workspace_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          sub_custom_type?:
            | Database["public"]["Enums"]["workspace_subscriptions_custom_type"]
            | null
          sub_type?: Database["public"]["Enums"]["workspace_subscriptions_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          companies_operation_status: Database["public"]["Enums"]["workspace_operation_status"]
          contacts_operation_status: Database["public"]["Enums"]["workspace_operation_status"]
          created_at: string
          display_name: string
          domain: string
          hub_id: string
          id: string
          installation_dup_done: number
          installation_dup_total: number
          installation_fetched: boolean
          installation_items_count: number
          installation_items_total: number
          installation_similarities_done_batches: number
          installation_similarities_total_batches: number
          installation_status: Database["public"]["Enums"]["workspace_installation_status"]
          refresh_token: string
          user_id: string
          user_mail: string
        }
        Insert: {
          companies_operation_status?: Database["public"]["Enums"]["workspace_operation_status"]
          contacts_operation_status?: Database["public"]["Enums"]["workspace_operation_status"]
          created_at?: string
          display_name: string
          domain: string
          hub_id: string
          id?: string
          installation_dup_done?: number
          installation_dup_total?: number
          installation_fetched: boolean
          installation_items_count?: number
          installation_items_total?: number
          installation_similarities_done_batches?: number
          installation_similarities_total_batches?: number
          installation_status?: Database["public"]["Enums"]["workspace_installation_status"]
          refresh_token: string
          user_id?: string
          user_mail: string
        }
        Update: {
          companies_operation_status?: Database["public"]["Enums"]["workspace_operation_status"]
          contacts_operation_status?: Database["public"]["Enums"]["workspace_operation_status"]
          created_at?: string
          display_name?: string
          domain?: string
          hub_id?: string
          id?: string
          installation_dup_done?: number
          installation_dup_total?: number
          installation_fetched?: boolean
          installation_items_count?: number
          installation_items_total?: number
          installation_similarities_done_batches?: number
          installation_similarities_total_batches?: number
          installation_status?: Database["public"]["Enums"]["workspace_installation_status"]
          refresh_token?: string
          user_id?: string
          user_mail?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_merged_items_by_months: {
        Args: {
          workspace_id_arg: string
        }
        Returns: {
          month: string
          count: number
        }[]
      }
      mark_items_without_similarities_as_dup_checked: {
        Args: {
          workspace_id_arg: string
        }
        Returns: undefined
      }
      similarities_increment_done_batches: {
        Args: {
          workspace_id_arg: string
        }
        Returns: number
      }
    }
    Enums: {
      company_similaritie_field_type:
        | "full_address"
        | "domain"
        | "website"
        | "name"
        | "phone"
        | "facebook_company_page"
        | "linkedin_company_page"
        | "twitterhandle"
      company_similaritie_similarity_score:
        | "exact"
        | "similar"
        | "potential"
        | "unlikely"
      contact_similaritie_field_type: "fullname" | "phone" | "email" | "company"
      contact_similaritie_similarity_score:
        | "exact"
        | "similar"
        | "potential"
        | "unlikely"
      data_cleaning_jobs_mode: "standard" | "expert"
      data_cleaning_jobs_recurrence:
        | "each-new"
        | "each-new-and-updated"
        | "every-day"
        | "every-week"
        | "every-month"
      dup_stack_item_dup_type:
        | "REFERENCE"
        | "CONFIDENT"
        | "POTENTIAL"
        | "FALSE_POSITIVE"
      dup_stack_item_type: "CONTACTS" | "COMPANIES"
      similarities_similarity_score:
        | "exact"
        | "similar"
        | "potential"
        | "unlikely"
      user_role: "SUPERADMIN"
      workspace_installation_status:
        | "FRESH"
        | "PENDING"
        | "DONE"
        | "ERROR"
        | "INSTALLING"
      workspace_operation_status: "NONE" | "PENDING"
      workspace_subscriptions_custom_type: "BETA"
      workspace_subscriptions_type: "STRIPE" | "CUSTOM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

