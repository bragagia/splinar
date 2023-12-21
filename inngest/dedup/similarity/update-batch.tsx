import { inngest } from "@/inngest";
import {
  companiesSimilarityCheck,
  fetchCompaniesBatch,
} from "@/inngest/dedup/similarity/companies";
import {
  contactSimilarityCheck,
  fetchContactsBatch,
} from "@/inngest/dedup/similarity/contacts";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function similaritiesUpdateBatch(
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
      async () => {
        await inngest.send({
          name: "workspace/contacts/similarities/install.finished",
          data: {
            workspaceId: workspaceId,
          },
        });
      },
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
      async () => {
        await inngest.send({
          name: "workspace/companies/similarities/install.finished",
          data: {
            workspaceId: workspaceId,
          },
        });
      },
      batchAIds,
      batchBIds
    );
  }
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
  installFinishedCallback: () => Promise<void>,
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

  const { data: isFinished, error: errorIncrement } = await supabase.rpc(
    incrementFunc,
    {
      workspace_id_arg: workspaceId,
    }
  );
  if (errorIncrement) {
    throw errorIncrement;
  }

  if (isFinished) {
    await installFinishedCallback();
  }
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
