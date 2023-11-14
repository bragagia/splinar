import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export const SUPABASE_FILTER_MAX_SIZE = 300;

export type WorkspaceType = MergeDeep<
  Database["public"]["Tables"]["workspaces"]["Insert"],
  {
    installation_status: "FRESH" | "PENDING" | "DONE" | "ERROR";
  }
>;

export type HsContactType =
  Database["public"]["Tables"]["hs_contacts"]["Insert"];

export type HsContactWithCompaniesType = MergeDeep<
  HsContactType,
  {
    hs_companies: HsCompanyType[];
  }
>;

export function isAnHsContactWithCompaniesType(
  obj: any
): obj is HsContactWithCompaniesType {
  if (!obj) return false;
  return "id" in obj && "first_name" in obj && "hs_companies" in obj;
}

export type HsContactWithCompaniesAndSimilaritiesType = MergeDeep<
  HsContactWithCompaniesType,
  {
    hs_contact_similarities: HsContactSimilarityType[];
  }
>;

export type HsCompanyType =
  Database["public"]["Tables"]["hs_companies"]["Insert"];

export type HsContactToHsCompany =
  Database["public"]["Tables"]["hs_contact_companies"]["Insert"];

export type HsContactSimilarityType = MergeDeep<
  Database["public"]["Tables"]["hs_contact_similarities"]["Insert"],
  {
    field_type: "fullname" | "phone" | "email" | "company";
    similarity_score: "exact" | "similar" | "potential" | "unlikely";
  }
>;

export type HsDupStackType =
  Database["public"]["Tables"]["hs_dup_stacks"]["Insert"];
