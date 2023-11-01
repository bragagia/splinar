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
      hs_companies: {
        Row: {
          created_at: string
          hs_id: string
          id: string
          name: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          hs_id: string
          id: string
          name?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          hs_id?: string
          id?: string
          name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      hs_contact_companies: {
        Row: {
          hs_company_id: string
          hs_contact_id: string
          workspace_id: string
        }
        Insert: {
          hs_company_id: string
          hs_contact_id: string
          workspace_id: string
        }
        Update: {
          hs_company_id?: string
          hs_contact_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_contact_companies_hs_company_id_fkey"
            columns: ["hs_company_id"]
            referencedRelation: "hs_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_contact_companies_hs_contact_id_fkey"
            columns: ["hs_contact_id"]
            referencedRelation: "hs_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_contact_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      hs_contact_similarities: {
        Row: {
          contact_a_id: string
          contact_a_value: string
          contact_b_id: string
          contact_b_value: string
          created_at: string
          field_type: string
          id: string
          similarity_score: string
          workspace_id: string
        }
        Insert: {
          contact_a_id: string
          contact_a_value: string
          contact_b_id: string
          contact_b_value: string
          created_at?: string
          field_type: string
          id: string
          similarity_score: string
          workspace_id: string
        }
        Update: {
          contact_a_id?: string
          contact_a_value?: string
          contact_b_id?: string
          contact_b_value?: string
          created_at?: string
          field_type?: string
          id?: string
          similarity_score?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_contact_similarities_contact_a_id_fkey"
            columns: ["contact_a_id"]
            referencedRelation: "hs_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_contact_similarities_contact_b_id_fkey"
            columns: ["contact_b_id"]
            referencedRelation: "hs_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_contact_similarities_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      hs_contacts: {
        Row: {
          company_name: string | null
          created_at: string
          dup_checked: boolean
          emails: string[] | null
          filled_score: number
          first_name: string | null
          hs_id: string
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
          hs_id: string
          id: string
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
          hs_id?: string
          id?: string
          last_name?: string | null
          phones?: string[] | null
          similarity_checked?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      hs_dup_stacks: {
        Row: {
          confident_contact_ids: string[]
          created_at: string
          id: string
          potential_contact_ids: string[] | null
          workspace_id: string
        }
        Insert: {
          confident_contact_ids: string[]
          created_at?: string
          id: string
          potential_contact_ids?: string[] | null
          workspace_id: string
        }
        Update: {
          confident_contact_ids?: string[]
          created_at?: string
          id?: string
          potential_contact_ids?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_dup_stacks_workspace_id_fkey"
            columns: ["workspace_id"]
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          display_name: string
          domain: string
          hub_id: string
          id: string
          installation_dup_done: number
          installation_dup_total: number
          installation_fetched: boolean
          installation_similarity_done_batches: number
          installation_similarity_total_batches: number
          installation_status: string
          refresh_token: string
          user_id: string
          user_mail: string
        }
        Insert: {
          created_at?: string
          display_name: string
          domain: string
          hub_id: string
          id: string
          installation_dup_done: number
          installation_dup_total: number
          installation_fetched: boolean
          installation_similarity_done_batches: number
          installation_similarity_total_batches: number
          installation_status?: string
          refresh_token: string
          user_id?: string
          user_mail: string
        }
        Update: {
          created_at?: string
          display_name?: string
          domain?: string
          hub_id?: string
          id?: string
          installation_dup_done?: number
          installation_dup_total?: number
          installation_fetched?: boolean
          installation_similarity_done_batches?: number
          installation_similarity_total_batches?: number
          installation_status?: string
          refresh_token?: string
          user_id?: string
          user_mail?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
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
      mark_contacts_without_similarities_as_dup_checked: {
        Args: {
          workspace_id_arg: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
