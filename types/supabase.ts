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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
            foreignKeyName: "hs_contact_similarities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
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
          emails: string[] | null
          first_name: string | null
          hs_id: string
          id: string
          last_name: string | null
          phones: string[] | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          emails?: string[] | null
          first_name?: string | null
          hs_id: string
          id: string
          last_name?: string | null
          phones?: string[] | null
          user_id: string
          workspace_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          emails?: string[] | null
          first_name?: string | null
          hs_id?: string
          id?: string
          last_name?: string | null
          phones?: string[] | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_contacts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_contacts_workspace_id_fkey"
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
