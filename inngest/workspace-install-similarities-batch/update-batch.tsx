import { areItemsDups } from "@/inngest/workspace-install-dupstacks/are-items-dups";
import { evalSimilarities } from "@/inngest/workspace-install-similarities-batch/eval-similarities";
import { ItemTypeT, itemBatchBoundaries } from "@/lib/items_common";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

const MAX_DUPS_PER_ITEM_PER_BATCH = 5;

export async function compareBatchWithItself(
  workspaceId: string,
  batch: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];
  let itemIdsWithSims: string[] = [];

  batch.forEach((batchItem, i) => {
    let batchItemSimilarities: TablesInsert<"similarities">[] = [];
    let dupCount = 0;

    for (let j = i + 1; j < batch.length; j++) {
      let comparedItem = batch[j];

      let pairSimilarities = evalSimilarities(
        workspaceId,
        batchItem,
        comparedItem
      );

      if (
        pairSimilarities &&
        pairSimilarities.length > 0 &&
        areItemsDups(
          { similarities: pairSimilarities, ...batchItem },
          { similarities: pairSimilarities, ...comparedItem }
        )
      ) {
        batchItemSimilarities.push(...pairSimilarities);
        itemIdsWithSims.push(batchItem.id);
        itemIdsWithSims.push(comparedItem.id);
        dupCount++;
      }

      if (dupCount >= MAX_DUPS_PER_ITEM_PER_BATCH) {
        break;
      }
    }

    similarities.push(...batchItemSimilarities);
  });

  return { similarities, itemIdsWithSims };
}

export async function compareBatchesPair(
  workspaceId: string,
  batch: Tables<"items">[],
  comparedItems: Tables<"items">[]
) {
  let similarities: TablesInsert<"similarities">[] = [];
  let itemIdsWithSims: string[] = [];

  batch.forEach((batchItem) => {
    let batchItemSimilarities: TablesInsert<"similarities">[] = [];
    let dupCount = 0;

    for (let i = 0; i < comparedItems.length; i++) {
      let comparedItem = comparedItems[i];

      let pairSimilarities = evalSimilarities(
        workspaceId,
        batchItem,
        comparedItem
      );

      if (
        pairSimilarities &&
        pairSimilarities.length > 0 &&
        areItemsDups(
          { similarities: pairSimilarities, ...batchItem },
          { similarities: pairSimilarities, ...comparedItem }
        )
      ) {
        batchItemSimilarities.push(...pairSimilarities);
        itemIdsWithSims.push(batchItem.id);
        itemIdsWithSims.push(comparedItem.id);
        dupCount++;
      }

      if (dupCount >= MAX_DUPS_PER_ITEM_PER_BATCH) {
        break;
      }
    }

    similarities.push(...batchItemSimilarities);
  });

  return { similarities, itemIdsWithSims };
}

export async function fetchBatchItems(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemType: ItemTypeT,
  boundaries: itemBatchBoundaries
) {
  const { data: batch, error } = await supabase
    .from("items")
    .select("*")
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("item_type", itemType)
    .gte("id_seq", boundaries.startAt)
    .lte("id_seq", boundaries.endAt);
  if (error) {
    throw error;
  }

  return batch;
}
