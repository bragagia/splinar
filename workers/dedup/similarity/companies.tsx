import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { uuid } from "@/lib/uuid";
import { CompanyType } from "@/types/companies";
import { InsertCompanySimilarityType } from "@/types/similarities";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import stringSimilarity from "string-similarity";

export async function fetchCompaniesBatch(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchIds: string[]
) {
  let batch: CompanyType[] = [];

  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { data: batchSlice, error } = await supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error || !batchSlice) {
      throw error;
    }

    batch.push(...batchSlice);
  }

  return batch;
}

export function companiesSimilarityCheck(
  workspaceId: string,
  companyA: CompanyType,
  companyB: CompanyType
) {
  if (companyA.id === companyB.id) {
    return undefined;
  }

  let similarities: InsertCompanySimilarityType[] = [];

  const addSimilarity = (
    field_type: InsertCompanySimilarityType["field_type"],
    valueA: string,
    valueB: string,
    similarity_score: InsertCompanySimilarityType["similarity_score"]
  ) => {
    similarities.push({
      id: uuid(),

      workspace_id: workspaceId,
      company_a_id: companyA.id,
      company_b_id: companyB.id,

      field_type: field_type,
      company_a_value: valueA,
      company_b_value: valueB,
      similarity_score: similarity_score,
    });
  };

  // Name
  if (companyA.name && companyB.name) {
    let a = companyA.name.trim().toLowerCase().replaceAll("  ", " ");
    let b = companyB.name.trim().toLowerCase().replaceAll("  ", " ");

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("name", a, b, "exact");
      } else {
        const compareScore = stringSimilarity.compareTwoStrings(a, b);

        if (compareScore > 0.9) {
          addSimilarity("name", a, b, "similar");
        } else if (compareScore > 0.8) {
          addSimilarity("name", a, b, "potential");
        }
      }
    }
  }

  // Domain
  if (companyA.domain && companyB.domain) {
    const a = companyA.domain.trim().toLowerCase();
    const b = companyB.domain.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("domain", a, b, "exact");
      } else {
        const removeExt = (str: string) =>
          str.split(".").slice(0, -1).join(".");

        if (removeExt(a) === removeExt(b)) {
          addSimilarity("domain", a, b, "similar");
        }
      }
    }
  }

  // website
  if (companyA.website && companyB.website) {
    const a = companyA.website.trim().toLowerCase();
    const b = companyB.website.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("website", a, b, "exact");
      } else {
        const removeExt = (str: string) =>
          str.split(".").slice(0, -1).join(".");

        if (removeExt(a) === removeExt(b)) {
          addSimilarity("website", a, b, "similar");
        }
      }
    }
  }

  // facebook_company_page
  if (companyA.facebook_company_page && companyB.facebook_company_page) {
    const a = companyA.facebook_company_page.trim().toLowerCase();
    const b = companyB.facebook_company_page.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("facebook_company_page", a, b, "exact");
      }
    }
  }

  // linkedin_company_page
  if (companyA.linkedin_company_page && companyB.linkedin_company_page) {
    const a = companyA.linkedin_company_page.trim().toLowerCase();
    const b = companyB.linkedin_company_page.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("linkedin_company_page", a, b, "exact");
      }
    }
  }

  // twitterhandle
  if (companyA.twitterhandle && companyB.twitterhandle) {
    const a = companyA.twitterhandle.trim().toLowerCase();
    const b = companyB.twitterhandle.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("twitterhandle", a, b, "exact");
      }
    }
  }

  // phone
  if (companyA.phone && companyB.phone) {
    const a = companyA.phone.trim().toLowerCase();
    const b = companyB.phone.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("phone", a, b, "exact");
      }
    }
  }

  // full_address
  // -> Ignore for now

  return similarities;
}
