// Similarities

import { Database } from "@/types/supabase";

export type ContactSimilarityType =
  Database["public"]["Tables"]["contact_similarities"]["Row"];

export type InsertContactSimilarityType =
  Database["public"]["Tables"]["contact_similarities"]["Insert"];

export type CompanySimilarityType =
  Database["public"]["Tables"]["company_similarities"]["Row"];

export type InsertCompanySimilarityType =
  Database["public"]["Tables"]["company_similarities"]["Insert"];
