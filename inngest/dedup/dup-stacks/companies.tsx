import { areItemsDups } from "@/inngest/dedup/dup-stacks/are-items-dups";
import { GenericDupStack } from "@/inngest/dedup/dup-stacks/resolve-next-dup-stack";
import { listCompanyField } from "@/inngest/dedup/list-company-fields";
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
import { SupabaseClient } from "@supabase/supabase-js";

/*
 * ALGO
 */

const companyScoring = {
  name: {
    exact: 40,
    similar: 30,
    potential: 20,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  domain: {
    exact: 70,
    similar: 40,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  website: {
    exact: 70,
    similar: 40,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  facebook_company_page: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  linkedin_company_page: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  phone: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  twitterhandle: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  full_address: {},
};

export function areCompaniesDups(
  itemA: CompanyWithSimilaritiesType,
  itemB: CompanyWithSimilaritiesType,
  verbose: boolean = false
) {
  return areItemsDups(
    itemA,
    itemB,
    verbose,
    itemA.company_similarities.filter(
      (similarity) =>
        similarity.company_a_id === itemB.id ||
        similarity.company_b_id === itemB.id
    ),
    companyScoring,
    listCompanyField
  );
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
  for (let i = 0; i < dupstackIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error: errorChecked } = await supabase
      .from("companies")
      .update({ dup_checked: true })
      .in("id", dupstackIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE))
      .eq("workspace_id", workspaceId);
    if (errorChecked) {
      throw errorChecked;
    }
  }
}

export async function updateDupStackCompaniesInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotalCompanies, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorCompanies || dupTotalCompanies === null) {
    throw errorCompanies || new Error("missing count on companies");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_companies_dup_total: dupTotalCompanies,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  console.log("-> Companies dup total: ", dupTotalCompanies);
}

export async function updateDupStackCompaniesInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupCompaniesDone, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", true);
  if (errorCompanies || dupCompaniesDone === null) {
    throw errorCompanies || new Error("missing count");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_companies_dup_done: dupCompaniesDone,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    console.log(errorUpdate);
    return 0;
  }

  console.log("-> Dup stack companies batch", dupCompaniesDone);
}
