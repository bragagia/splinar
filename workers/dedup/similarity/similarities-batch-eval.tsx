import { captureException } from "@/lib/sentry";
import {
  CompanyType,
  ContactWithCompaniesType,
  SUPABASE_FILTER_MAX_SIZE,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { companiesSimilarityCheck } from "@/workers/dedup/similarity/companies-similarity-check";
import { contactSimilarityCheck } from "@/workers/dedup/similarity/contacts-similarity-check";
import { SupabaseClient } from "@supabase/supabase-js";

async function compareBatchesPair<T, RT>(
  workspaceId: string,
  comparatorFn: (workspaceId: string, itemA: T, itemB: T) => RT[] | undefined,
  batchA: T[],
  batchB: T[]
) {
  let similarities: RT[] = [];

  batchA.forEach((contactA) => {
    batchB.forEach((contactB) => {
      let pairSimilarities = comparatorFn(workspaceId, contactA, contactB);

      if (pairSimilarities && pairSimilarities.length > 0) {
        similarities.push(...pairSimilarities);
      }
    });
  });

  return similarities;
}

async function compareBatchWithItself<T, RT>(
  workspaceId: string,
  comparatorFn: (workspaceId: string, itemA: T, itemB: T) => RT[] | undefined,
  batch: T[]
) {
  let similarities: RT[] = [];

  batch.forEach((contactA, i) => {
    batch.slice(0, i).forEach((contactB) => {
      let pairSimilarities = comparatorFn(workspaceId, contactA, contactB);

      if (pairSimilarities && pairSimilarities.length > 0) {
        similarities.push(...pairSimilarities);
      }
    });
  });

  return similarities;
}

async function fetchContactsBatch(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchIds: string[]
) {
  let batch: ContactWithCompaniesType[] = [];

  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { data: batchSlice, error } = await supabase
      .from("contacts")
      .select("*, companies(*)")
      .eq("workspace_id", workspaceId)
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error || !batchSlice) {
      throw error;
    }

    batch.push(...batchSlice);
  }

  return batch;
}

async function fetchCompaniesBatch(
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

async function genericSimilaritiesBatchEval<T, RT>(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  similarityTable: "contact_similarities" | "company_similarities",
  incrementFunc:
    | "contacts_similarities_increment_done_batches"
    | "companies_similarities_increment_done_batches",
  fetcher: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    batchIds: string[]
  ) => Promise<T[]>,
  comparatorFn: (workspaceId: string, itemA: T, itemB: T) => RT[] | undefined,
  batchAIds: string[],
  batchBIds?: string[]
) {
  const batchA = await fetcher(supabase, workspaceId, batchAIds);

  let similarities: RT[] | undefined;

  if (!batchBIds) {
    similarities = await compareBatchWithItself(
      workspaceId,
      comparatorFn,
      batchA
    );
  } else {
    const batchB = await fetcher(supabase, workspaceId, batchBIds);

    similarities = await compareBatchesPair(
      workspaceId,
      comparatorFn,
      batchA,
      batchB
    );
  }

  let { error: errorInsert } = await supabase
    .from(similarityTable)
    .insert(similarities as any);
  if (errorInsert) {
    throw errorInsert;
  }

  const { error: errorIncrement } = await supabase.rpc(incrementFunc, {
    workspace_id_arg: workspaceId,
  });
  if (errorIncrement) {
    captureException(errorIncrement);
  }
}

export async function similaritiesBatchEval(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  table: "contacts" | "companies",
  batchAIds: string[],
  batchBIds?: string[]
) {
  if (table === "contacts") {
    await genericSimilaritiesBatchEval(
      supabase,
      workspaceId,
      "contact_similarities",
      "contacts_similarities_increment_done_batches",
      fetchContactsBatch,
      contactSimilarityCheck,
      batchAIds,
      batchBIds
    );
  } else if (table === "companies") {
    await genericSimilaritiesBatchEval(
      supabase,
      workspaceId,
      "company_similarities",
      "companies_similarities_increment_done_batches",
      fetchCompaniesBatch,
      companiesSimilarityCheck,
      batchAIds,
      batchBIds
    );
  }
}
