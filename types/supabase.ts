export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          domain: string | null
          dup_checked: boolean
          facebook_company_page: string | null
          filled_score: number
          hs_id: number
          id: string
          linkedin_company_page: string | null
          name: string | null
          owner_hs_id: number | null
          phone: string | null
          similarity_checked: boolean
          state: string | null
          twitterhandle: string | null
          website: string | null
          workspace_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          dup_checked: boolean
          facebook_company_page?: string | null
          filled_score: number
          hs_id: number
          id?: string
          linkedin_company_page?: string | null
          name?: string | null
          owner_hs_id?: number | null
          phone?: string | null
          similarity_checked: boolean
          state?: string | null
          twitterhandle?: string | null
          website?: string | null
          workspace_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          dup_checked?: boolean
          facebook_company_page?: string | null
          filled_score?: number
          hs_id?: number
          id?: string
          linkedin_company_page?: string | null
          name?: string | null
          owner_hs_id?: number | null
          phone?: string | null
          similarity_checked?: boolean
          state?: string | null
          twitterhandle?: string | null
          website?: string | null
          workspace_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      company_similarities: {
        Row: {
          company_a_id: string
          company_a_value: string
          company_b_id: string
          company_b_value: string
          created_at: string
          field_type: Database["public"]["Enums"]["company_similaritie_field_type"]
          id: string
          similarity_score: Database["public"]["Enums"]["company_similaritie_similarity_score"]
          workspace_id: string
        }
        Insert: {
          company_a_id: string
          company_a_value: string
          company_b_id: string
          company_b_value: string
          created_at?: string
          field_type: Database["public"]["Enums"]["company_similaritie_field_type"]
          id?: string
          similarity_score: Database["public"]["Enums"]["company_similaritie_similarity_score"]
          workspace_id: string
        }
        Update: {
          company_a_id?: string
          company_a_value?: string
          company_b_id?: string
          company_b_value?: string
          created_at?: string
          field_type?: Database["public"]["Enums"]["company_similaritie_field_type"]
          id?: string
          similarity_score?: Database["public"]["Enums"]["company_similaritie_similarity_score"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_similarities_company_a_id_fkey"
            columns: ["company_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_similarities_company_b_id_fkey"
            columns: ["company_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_similarities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_companies: {
        Row: {
          company_id: string
          contact_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          contact_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_companies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      contact_similarities: {
        Row: {
          contact_a_id: string
          contact_a_value: string
          contact_b_id: string
          contact_b_value: string
          created_at: string
          field_type: Database["public"]["Enums"]["contact_similaritie_field_type"]
          id: string
          similarity_score: Database["public"]["Enums"]["contact_similaritie_similarity_score"]
          workspace_id: string
        }
        Insert: {
          contact_a_id: string
          contact_a_value: string
          contact_b_id: string
          contact_b_value: string
          created_at?: string
          field_type: Database["public"]["Enums"]["contact_similaritie_field_type"]
          id?: string
          similarity_score: Database["public"]["Enums"]["contact_similaritie_similarity_score"]
          workspace_id: string
        }
        Update: {
          contact_a_id?: string
          contact_a_value?: string
          contact_b_id?: string
          contact_b_value?: string
          created_at?: string
          field_type?: Database["public"]["Enums"]["contact_similaritie_field_type"]
          id?: string
          similarity_score?: Database["public"]["Enums"]["contact_similaritie_similarity_score"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_similarities_contact_a_id_fkey"
            columns: ["contact_a_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_similarities_contact_b_id_fkey"
            columns: ["contact_b_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_similarities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      contacts: {
        Row: {
          company_name: string | null
          created_at: string
          dup_checked: boolean
          emails: string[] | null
          filled_score: number
          first_name: string | null
          hs_id: number
          id: string
          last_name: string | null
          phones: string[] | null
          similarity_checked: boolean
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          dup_checked: boolean
          emails?: string[] | null
          filled_score: number
          first_name?: string | null
          hs_id: number
          id?: string
          last_name?: string | null
          phones?: string[] | null
          similarity_checked: boolean
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          dup_checked?: boolean
          emails?: string[] | null
          filled_score?: number
          first_name?: string | null
          hs_id?: number
          id?: string
          last_name?: string | null
          phones?: string[] | null
          similarity_checked?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      dup_stack_companies: {
        Row: {
          company_id: string
          created_at: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dup_type?: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dup_stack_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_companies_dup_stacks_id_fkey"
            columns: ["dupstack_id"]
            isOneToOne: false
            referencedRelation: "dup_stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      dup_stack_contacts: {
        Row: {
          contact_id: string
          created_at: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          dup_type: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          dup_type?: Database["public"]["Enums"]["dup_stack_item_dup_type"]
          dupstack_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dup_stack_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_contacts_dup_stacks_id_fkey"
            columns: ["dupstack_id"]
            isOneToOne: false
            referencedRelation: "dup_stacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dup_stack_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
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
          }
        ]
      }
      merged_companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          domain: string | null
          facebook_company_page: string | null
          hs_id: number
          id: string
          linkedin_company_page: string | null
          merged_in_hs_id: number
          name: string | null
          owner_hs_id: number | null
          phone: string | null
          state: string | null
          twitterhandle: string | null
          website: string | null
          workspace_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          facebook_company_page?: string | null
          hs_id: number
          id?: string
          linkedin_company_page?: string | null
          merged_in_hs_id: number
          name?: string | null
          owner_hs_id?: number | null
          phone?: string | null
          state?: string | null
          twitterhandle?: string | null
          website?: string | null
          workspace_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain?: string | null
          facebook_company_page?: string | null
          hs_id?: number
          id?: string
          linkedin_company_page?: string | null
          merged_in_hs_id?: number
          name?: string | null
          owner_hs_id?: number | null
          phone?: string | null
          state?: string | null
          twitterhandle?: string | null
          website?: string | null
          workspace_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merged_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      merged_contacts: {
        Row: {
          companies_hs_id: number[] | null
          company_name: string | null
          created_at: string
          emails: string[] | null
          first_name: string | null
          hs_id: number
          id: string
          last_name: string | null
          merged_in_hs_id: number
          phones: string[] | null
          workspace_id: string
        }
        Insert: {
          companies_hs_id?: number[] | null
          company_name?: string | null
          created_at?: string
          emails?: string[] | null
          first_name?: string | null
          hs_id: number
          id?: string
          last_name?: string | null
          merged_in_hs_id: number
          phones?: string[] | null
          workspace_id: string
        }
        Update: {
          companies_hs_id?: number[] | null
          company_name?: string | null
          created_at?: string
          emails?: string[] | null
          first_name?: string | null
          hs_id?: number
          id?: string
          last_name?: string | null
          merged_in_hs_id?: number
          phones?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merged_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
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
          }
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
          }
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
          installation_companies_count: number
          installation_companies_dup_done: number
          installation_companies_dup_total: number
          installation_companies_similarities_done_batches: number
          installation_companies_similarities_total_batches: number
          installation_companies_total: number
          installation_contacts_count: number
          installation_contacts_dup_done: number
          installation_contacts_dup_total: number
          installation_contacts_similarities_done_batches: number
          installation_contacts_similarities_total_batches: number
          installation_contacts_total: number
          installation_fetched: boolean
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
          installation_companies_count?: number
          installation_companies_dup_done?: number
          installation_companies_dup_total?: number
          installation_companies_similarities_done_batches: number
          installation_companies_similarities_total_batches: number
          installation_companies_total?: number
          installation_contacts_count?: number
          installation_contacts_dup_done?: number
          installation_contacts_dup_total?: number
          installation_contacts_similarities_done_batches: number
          installation_contacts_similarities_total_batches: number
          installation_contacts_total?: number
          installation_fetched: boolean
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
          installation_companies_count?: number
          installation_companies_dup_done?: number
          installation_companies_dup_total?: number
          installation_companies_similarities_done_batches?: number
          installation_companies_similarities_total_batches?: number
          installation_companies_total?: number
          installation_contacts_count?: number
          installation_contacts_dup_done?: number
          installation_contacts_dup_total?: number
          installation_contacts_similarities_done_batches?: number
          installation_contacts_similarities_total_batches?: number
          installation_contacts_total?: number
          installation_fetched?: boolean
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
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      companies_similarities_increment_done_batches: {
        Args: {
          workspace_id_arg: string
        }
        Returns: boolean
      }
      contacts_similarities_increment_done_batches: {
        Args: {
          workspace_id_arg: string
        }
        Returns: boolean
      }
      get_merged_companies_by_months: {
        Args: {
          workspace_id_arg: string
        }
        Returns: {
          month: string
          count: number
        }[]
      }
      get_merged_contacts_by_months: {
        Args: {
          workspace_id_arg: string
        }
        Returns: {
          month: string
          count: number
        }[]
      }
      mark_companies_without_similarities_as_dup_checked: {
        Args: {
          workspace_id_arg: string
        }
        Returns: undefined
      }
      mark_contacts_without_similarities_as_dup_checked: {
        Args: {
          workspace_id_arg: string
        }
        Returns: undefined
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
      dup_stack_item_dup_type:
        | "REFERENCE"
        | "CONFIDENT"
        | "POTENTIAL"
        | "FALSE_POSITIVE"
      dup_stack_item_type: "CONTACTS" | "COMPANIES"
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

