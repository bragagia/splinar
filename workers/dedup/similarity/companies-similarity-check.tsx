import { uuid } from "@/lib/uuid";
import { CompanyType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import stringSimilarity from "string-similarity";

export function companiesSimilarityCheck(
  workspaceId: string,
  companyA: CompanyType,
  companyB: CompanyType
) {
  if (companyA.id === companyB.id) {
    return undefined;
  }

  let similarities: Database["public"]["Tables"]["company_similarities"]["Insert"][] =
    [];

  const similarityBase: Database["public"]["Tables"]["company_similarities"]["Insert"] =
    {
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
      const nameSimilarityBase: Database["public"]["Tables"]["company_similarities"]["Insert"] =
        {
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
