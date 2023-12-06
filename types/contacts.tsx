import { CompanyType } from "@/types/companies";
import { ContactSimilarityType } from "@/types/similarities";
import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type ContactType = Database["public"]["Tables"]["contacts"]["Row"];

export type InsertContactType =
  Database["public"]["Tables"]["contacts"]["Insert"];

export type MergedContactType =
  Database["public"]["Tables"]["merged_contacts"]["Row"];

export type ContactWithCompaniesType = MergeDeep<
  ContactType,
  {
    companies: CompanyType[]; // TODO:
  }
>;

export type ContactWithCompaniesAndSimilaritiesType = MergeDeep<
  ContactWithCompaniesType,
  {
    contact_similarities: ContactSimilarityType[];
  }
>;

export type ContactWithCompaniesAndRawSimilaritiesType = MergeDeep<
  ContactWithCompaniesType,
  {
    similarities_a: ContactSimilarityType[];
    similarities_b: ContactSimilarityType[];
  }
>;

export type InsertMergedContactType =
  Database["public"]["Tables"]["merged_contacts"]["Insert"];
