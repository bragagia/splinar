import { inngest } from "@/inngest";
import { getItemType, itemTypeT } from "@/lib/items_common";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function similaritiesUpdateBatch(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  table: itemTypeT,
  batchAIds: string[],
  batchBIds?: string[]
) {
  const itemType = getItemType(table);

  await genericSimilaritiesBatchEval(
    supabase,
    workspaceId,
    itemType.similarityCheck,
    batchAIds,
    batchBIds
  );
}

async function genericSimilaritiesBatchEval(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  comparatorFn: (
    workspaceId: string,
    itemA: Tables<"items">,
    itemB: Tables<"items">
  ) => TablesInsert<"similarities">[] | undefined,
  batchAIds: string[],
  batchBIds?: string[]
) {
  const batchA = await fetchBatchItems(supabase, workspaceId, batchAIds);

  let similarities: TablesInsert<"similarities">[] | undefined;

  if (!batchBIds) {
    similarities = await compareBatchWithItself(
      workspaceId,
      comparatorFn,
      batchA
    );
  } else {
    const batchB = await fetchBatchItems(supabase, workspaceId, batchBIds);

    similarities = await compareBatchesPair(
      workspaceId,
      comparatorFn,
      batchA,
      batchB
    );
  }

  let { error: errorInsert } = await supabase
    .from("similarities")
    .insert(similarities as any);
  if (errorInsert) {
    throw errorInsert;
  }

  const { data: isFinished, error: errorIncrement } = await supabase.rpc(
    "similarities_increment_done_batches",
    {
      workspace_id_arg: workspaceId,
    }
  );
  if (errorIncrement) {
    throw errorIncrement;
  }

  if (isFinished) {
    await inngest.send({
      name: "workspace/any/similarities/install.finished",
      data: {
        workspaceId: workspaceId,
      },
    });
  }
}

async function compareBatchWithItself(
  workspaceId: string,
  comparatorFn: (
    workspaceId: string,
    itemA: Tables<"items">,
    itemB: Tables<"items">
  ) => TablesInsert<"similarities">[] | undefined,
  batch: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];

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

async function compareBatchesPair(
  workspaceId: string,
  comparatorFn: (
    workspaceId: string,
    itemA: Tables<"items">,
    itemB: Tables<"items">
  ) => TablesInsert<"similarities">[] | undefined,
  batchA: Tables<"items">[],
  batchB: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];

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

export async function fetchBatchItems(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchIds: string[]
) {
  let batch: Tables<"items">[] = [];

  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { data: batchSlice, error } = await supabase
      .from("items")
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
