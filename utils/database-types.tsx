import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type WorkspaceType =
  Database["public"]["Tables"]["workspaces"]["Insert"];

export type HsContactType =
  Database["public"]["Tables"]["hs_contacts"]["Insert"];

export type HsContactSimilarityType = MergeDeep<
  Database["public"]["Tables"]["hs_contact_similarities"]["Insert"],
  {
    field_type: "fullname" | "phone" | "email" | "company";
    similarity_score: "exact" | "similar" | "potential" | "unlikely";
  }
>;

export type ContactDuplicatesType = {
  confidents: string[];
  potentials: string[];
};
