import { Database } from "@/types/supabase";

export type WorkspaceType = Database["public"]["Tables"]["workspaces"]["Row"];
