import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { ItemTypeT } from "@/lib/items_common";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export const SIMILARITIES_BATCH_SIZE = 1000;
export const FREE_TIER_BATCH_LIMIT = 5;

export async function launchWorkspaceSimilaritiesBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string,
  isFreeTier: boolean,
  itemType: ItemTypeT
) {
  console.log("Starting", itemType, "sim check");

  let batchLength = 0;

  let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];
  let installedBatchesIds = await listInstalledBatches(
    supabase,
    workspaceId,
    itemType
  );

  if (isFreeTier && installedBatchesIds.length >= FREE_TIER_BATCH_LIMIT) {
    console.log("Free tier limit reached");
    return payloads;
  }

  do {
    let query = supabase
      .from("items")
      .select("id, id_seq")
      .is("merged_in_distant_id", null)
      .eq("item_type", itemType)
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .order("id_seq", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    const { data: batch, error: error } = await query;
    if (error) {
      throw error;
    }
    if (!batch || batch.length === 0) {
      break;
    }
    batchLength = batch.length;

    const batchIds = batch.map((item) => item.id);

    payloads.push({
      name: "workspace/install/similarities/batch.start",
      data: {
        workspaceId: workspaceId,
        operationId: operationId,
        itemType: itemType,
        batchIds: batchIds,
      },
    });

    console.log(itemType + " similarities batch started: ", payloads.length);

    for (let i = 0; i < installedBatchesIds.length; i++) {
      payloads.push({
        name: "workspace/install/similarities/batch.start",
        data: {
          workspaceId: workspaceId,
          operationId: operationId,
          itemType: itemType,
          batchIds: batchIds,
          comparedItemsIds: installedBatchesIds[i],
        },
      });
    }

    const { error: errorMark } = await supabase.rpc(
      "mark_batch_installed_and_remove_existing_similarities",
      {
        arg_item_ids: batchIds,
      }
    );
    if (errorMark) {
      throw errorMark;
    }

    installedBatchesIds.push(batchIds);
  } while (
    batchLength === SIMILARITIES_BATCH_SIZE &&
    !(isFreeTier && installedBatchesIds.length >= FREE_TIER_BATCH_LIMIT)
  );

  return payloads;
}

async function listInstalledBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemType: ItemTypeT
) {
  let list: string[][] = [];

  let lastItemIdSeq: number | undefined = undefined;
  do {
    let query = supabase
      .from("items")
      .select("id, id_seq")
      .is("merged_in_distant_id", null)
      .eq("item_type", itemType)
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("id_seq", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    if (lastItemIdSeq) {
      query = query.gt("id_seq", lastItemIdSeq);
    }

    const { data: installedBatch, error: errorInstalledBatch } = await query;
    if (errorInstalledBatch) {
      console.log("errorInstalledBatch", errorInstalledBatch);
      break;
    }
    if (!installedBatch || installedBatch.length === 0) {
      break;
    }

    const installedBatchIds = installedBatch.map((item) => item.id);
    list.push(installedBatchIds);

    console.log(itemType + " similarities batch installed: ", list.length);

    lastItemIdSeq = installedBatch[installedBatch.length - 1].id_seq;
    if (installedBatch.length !== SIMILARITIES_BATCH_SIZE) {
      lastItemIdSeq = undefined;
    }
  } while (lastItemIdSeq);

  return list;
}
