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

  const similarityBase: InsertCompanySimilarityType = {
    workspace_id: workspaceId,
    company_a_id: companyA.id,
    company_b_id: companyB.id,

    // Boilerplate, will be replaced later
    field_type: "name",
    company_a_value: "",
    company_b_value: "",
    similarity_score: "unlikely",
  };

  // Name
  if (companyA.name && companyB.name) {
    let aName = companyA.name.trim().toLowerCase().replaceAll("  ", " ");
    let bName = companyB.name.trim().toLowerCase().replaceAll("  ", " ");

    if (aName !== "" && bName !== "") {
      const nameSimilarityBase: InsertCompanySimilarityType = {
        ...similarityBase,
        id: uuid(),
        field_type: "name",
        company_a_value: aName,
        company_b_value: bName,
      };

      if (aName == bName) {
        similarities.push({
          ...nameSimilarityBase,
          similarity_score: "exact",
        });
      } else {
        const compareScore = stringSimilarity.compareTwoStrings(aName, bName);

        if (compareScore > 0.9) {
          similarities.push({
            ...nameSimilarityBase,
            similarity_score: "similar",
          });
        } else if (compareScore > 0.8) {
          similarities.push({
            ...nameSimilarityBase,
            similarity_score: "potential",
          });
        }
      }
    }
  }

  return similarities;
}
