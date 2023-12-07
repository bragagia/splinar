import { CompanySimilarityType } from "@/types/similarities";
import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type CompanyType = Database["public"]["Tables"]["companies"]["Row"];

export type InsertCompanyType =
  Database["public"]["Tables"]["companies"]["Insert"];

export function getCompanyAddress(company: CompanyType) {
  return [
    company.address,
    company.zip,
    company.city,
    company.state,
    company.country,
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(" ");
}

export type CompanyWithSimilaritiesType = MergeDeep<
  CompanyType,
  {
    company_similarities: CompanySimilarityType[];
  }
>;

export type CompanyWithRawSimilaritiesType = MergeDeep<
  CompanyType,
  {
    similarities_a: CompanySimilarityType[];
    similarities_b: CompanySimilarityType[];
  }
>;

export type InsertMergedCompaniesType =
  Database["public"]["Tables"]["merged_companies"]["Insert"];
