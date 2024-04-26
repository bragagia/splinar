import { evalSimilarities } from "@/inngest/workspace-install-similarities-batch/eval-similarities";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function compareBatchWithItself(
  workspaceId: string,
  batch: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];

  batch.forEach((contactA, i) => {
    let contactASimilarities: TablesInsert<"similarities">[] = [];

    for (let j = i + 1; j < batch.length; j++) {
      let contactB = batch[j];

      let pairSimilarities = evalSimilarities(workspaceId, contactA, contactB);

      if (pairSimilarities && pairSimilarities.length > 0) {
        contactASimilarities.push(...pairSimilarities);
      }

      if (contactASimilarities.length > MAX_SIMILARITIES_PER_CONTACT) {
        break;
      }
    }

    similarities.push(...contactASimilarities);
  });

  return similarities;
}

const MAX_SIMILARITIES_PER_CONTACT = 20;

export async function compareBatchesPair(
  workspaceId: string,
  batch: Tables<"items">[],
  comparedItems: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];

  batch.forEach((batchItem) => {
    let batchSimilarities: TablesInsert<"similarities">[] = [];

    for (let i = 0; i < comparedItems.length; i++) {
      let comparedItem = comparedItems[i];

      let pairSimilarities = evalSimilarities(
        workspaceId,
        batchItem,
        comparedItem
      );

      if (pairSimilarities && pairSimilarities.length > 0) {
        batchSimilarities.push(...pairSimilarities);
      }

      if (batchSimilarities.length > MAX_SIMILARITIES_PER_CONTACT) {
        break;
      }
    }

    similarities.push(...batchSimilarities);
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
