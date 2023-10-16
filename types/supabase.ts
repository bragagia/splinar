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
