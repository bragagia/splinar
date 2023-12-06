import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { uuid } from "@/lib/uuid";
import {
  CompanyWithRawSimilaritiesType,
  CompanyWithSimilaritiesType,
} from "@/types/companies";
import {
  InsertDupStackCompanyItemType,
  InsertDupStackType,
} from "@/types/dupstacks";
import { CompanySimilarityType } from "@/types/similarities";
import { Database } from "@/types/supabase";
import { GenericDupStack } from "@/workers/dedup/dup-stacks/resolve-next-dup-stack";
import { CompanyFieldsType } from "@/workers/dedup/list-company-fields";
import { SupabaseClient } from "@supabase/supabase-js";

/*
 * ALGO
 */

const companyScoring = {
  name: {
    exact: 70,
    similar: 40,
    potential: 30,
    unlikely: 0,
  },
};

const CompanyFieldsList: CompanyFieldsType[] = ["name"];

export function areCompaniesDups(
  companyA: CompanyWithSimilaritiesType,
  companyB: CompanyWithSimilaritiesType
): "CONFIDENT" | "POTENTIAL" | false {
  if (!companyA || !companyB) {
    return false;
  }

  const similaritiesOfCompanies = companyA.company_similarities.filter(
    (similarity) =>
      similarity.company_a_id === companyB.id ||
      similarity.company_b_id === companyB.id
  );

  // const contactAFields = listContactField(companyA);
  // const contactBFields = listContactField(companyB);

  // const filledField = Math.min(companyA.filled_score, companyB.filled_score);

  // let unmatchingFieldCount = 0;
  let similarityScore = 0;

  // Calc similarity multiplier
  // let companySimilarity = similaritiesOfContacts.find(
  //   (similarity) => similarity.field_type === "company"
  // );
  // const sameCompanyBonusMultiplier = companySimilarity
  //   ? scoring["company"][companySimilarity.similarity_score]
  //   : 0;

  CompanyFieldsList.forEach((field) => {
    let similarity = similaritiesOfCompanies.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      // if (
      //   contactAFields.find((cf) => cf === field) &&
      //   contactBFields.find((cf) => cf === field)
      // ) {
      //   unmatchingFieldCount++; // TODO: Use notMatchingFieldsScore instead
      // }

      return;
    }

    similarityScore += companyScoring[field][similarity.similarity_score];
    // + sameCompanyBonusMultiplier * contactScoring[field]["sameCompanyMatchingBonus"];
  });

  // const missingFieldsMultiplierBonus = (() => {
  //   switch (filledField) {
  //     case 1:
  //       return 2;
  //     case 2:
  //       return 1.5;
  //     case 3:
  //       return 1.2;
  //     default:
  //       return 1;
  //   }
  // })();

  //const unmatchingFieldMalus = unmatchingFieldCount * 20; // TODO: missing logic to use score

  const score = similarityScore;
  //(similarityScore - unmatchingFieldMalus) * missingFieldsMultiplierBonus;
  if (score >= 70) {
    return "CONFIDENT";
  } else if (score >= 30) {
    return "POTENTIAL";
  } else {
    return false;
  }
}

/*
 * Dup stack helpers
 */

export async function fetchNextCompanyReference(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from("companies")
    .select(
      `*,
      similarities_a:company_similarities!company_similarities_company_a_id_fkey(*), similarities_b:company_similarities!company_similarities_company_b_id_fkey(*)`
    )
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false)
    .order("filled_score", { ascending: false })
    .limit(1);
  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    return undefined;
  }

  const { similarities_a, similarities_b, ...company } = {
    ...data[0],
    company_similarities: data[0].similarities_a.concat(
      data[0].similarities_b
    ) as CompanySimilarityType[],
  };

  return company;
}

export async function fetchSimilarCompaniesSortedByFillScore(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  cacheById: {
    [key: string]: CompanyWithSimilaritiesType;
  },
  parentId: string
) {
  const parentItem = cacheById[parentId];

  let res = {
    parentItem: cacheById[parentId],
    similarItems: [] as CompanyWithSimilaritiesType[],
  };

  const similarItemsIds = parentItem.company_similarities.reduce(
    (acc, item) => {
      const similarID =
        item.company_a_id === parentId ? item.company_b_id : item.company_a_id;

      if (acc.find((v) => v === similarID)) {
        return acc;
      }

      acc.push(similarID);
      return acc;
    },
    [] as string[]
  );

  let similarItemsIdsToFetch: string[] = [];

  similarItemsIds.forEach((id, i) => {
    const cachedItem = cacheById[id];

    if (cachedItem) {
      res.similarItems.push(cachedItem);
    } else {
      similarItemsIdsToFetch.push(id);
    }
  });

  if (similarItemsIdsToFetch.length > 0) {
    let fetchedCompaniesRaw: CompanyWithRawSimilaritiesType[] = [];

    for (
      let i = 0;
      i < similarItemsIdsToFetch.length;
      i += SUPABASE_FILTER_MAX_SIZE
    ) {
      const { data, error } = await supabase
        .from("companies")
        .select(
          `*,
          similarities_a:company_similarities!company_similarities_company_a_id_fkey(*), similarities_b:company_similarities!company_similarities_company_b_id_fkey(*)`
        )
        .eq("workspace_id", workspaceId)
        .in(
          "id",
          similarItemsIdsToFetch.slice(i, i + SUPABASE_FILTER_MAX_SIZE)
        );
      if (error) {
        throw error;
      }

      fetchedCompaniesRaw.push(...data);
    }

    const fetchedCompanies = fetchedCompaniesRaw.map((raw_company) => {
      const { similarities_a, similarities_b, ...company } = {
        ...raw_company,
        company_similarities: raw_company.similarities_a.concat(
          raw_company.similarities_b
        ) as CompanySimilarityType[],
      };

      return company;
    });

    fetchedCompanies.forEach((item) => {
      res.similarItems.push(item);
      cacheById[item.id] = item;
    });
  }

  res.similarItems.sort((a, b) => b.filled_score - a.filled_score);

  return res;
}

export async function createCompanyDupstack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  genericDupstack: GenericDupStack
) {
  const dupstackId = uuid();
  const dupstack: InsertDupStackType = {
    id: dupstackId,
    workspace_id: workspaceId,
    item_type: "COMPANIES",
  };

  const dupstackCompanies: InsertDupStackCompanyItemType[] = [];

  dupstackCompanies.push(
    ...genericDupstack.confident_ids.map((id, i) => {
      const ret: InsertDupStackCompanyItemType = {
        company_id: id,
        dup_type: i === 0 ? "REFERENCE" : "CONFIDENT",
        dupstack_id: dupstackId,
        workspace_id: dupstack.workspace_id,
      };
      return ret;
    })
  );

  dupstackCompanies.push(
    ...genericDupstack.potential_ids.map((id, i) => {
      const ret: InsertDupStackCompanyItemType = {
        company_id: id,
        dup_type: "POTENTIAL",
        dupstack_id: dupstackId,
        workspace_id: dupstack.workspace_id,
      };
      return ret;
    })
  );

  const { error: errorDupstack } = await supabase
    .from("dup_stacks")
    .insert(dupstack);
  if (errorDupstack) {
    throw errorDupstack;
  }

  const { error: errorDupstackCompanies } = await supabase
    .from("dup_stack_companies")
    .insert(dupstackCompanies);
  if (errorDupstackCompanies) {
    throw errorDupstackCompanies;
  }
}

export async function markCompaniesDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackIds: string[]
) {
  const { error: errorChecked } = await supabase
    .from("companies")
    .update({ dup_checked: true })
    .in("id", dupstackIds)
    .eq("workspace_id", workspaceId);
  if (errorChecked) {
    throw errorChecked;
  }
}
