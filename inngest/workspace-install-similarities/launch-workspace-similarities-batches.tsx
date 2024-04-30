import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { ItemTypeT, itemBatchBoundaries } from "@/lib/items_common";
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
  let count = 0;

  let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];

  do {
    let query = supabase
      .from("items")
      .select("id_seq")
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

    const batchBoundaries: itemBatchBoundaries = {
      startAt: batch[0].id_seq,
      endAt: batch[batch.length - 1].id_seq,
    };

    payloads.push({
      name: "workspace/install/similarities/batch.start",
      data: {
        workspaceId: workspaceId,
        operationId: operationId,
        itemType: itemType,
        batchBoundaries: batchBoundaries,
      },
    });

    console.log(itemType + " similarities batch started: ", payloads.length);

    const payloadRet = await compareBatchWithAllInstalledBatches(
      supabase,
      workspaceId,
      operationId,
      itemType,
      batchBoundaries
    );
    payloads.push(...payloadRet);

    const { error: errorMark } = await supabase.rpc(
      "mark_batch_installed_and_remove_existing_similarities",
      {
        arg_workspace_id: workspaceId,
        arg_item_type: itemType,
        arg_id_seq_start: batchBoundaries.startAt,
        arg_id_seq_end: batchBoundaries.endAt,
      }
    );
    if (errorMark) {
      throw errorMark;
    }

    count++;
  } while (
    batchLength === SIMILARITIES_BATCH_SIZE &&
    (!isFreeTier || count < FREE_TIER_BATCH_LIMIT)
  );

  return payloads;
}

async function compareBatchWithAllInstalledBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string,
  itemType: ItemTypeT,
  batchBoundaries: itemBatchBoundaries
) {
  let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];

  let lastItemIdSeq: number | undefined = undefined;
  do {
    let query = supabase
      .from("items")
      .select("id_seq")
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

    const comparedItemsBoundaries: itemBatchBoundaries = {
      startAt: installedBatch[0].id_seq,
      endAt: installedBatch[installedBatch.length - 1].id_seq,
    };

    payloads.push({
      name: "workspace/install/similarities/batch.start",
      data: {
        workspaceId: workspaceId,
        operationId: operationId,
        itemType: itemType,
        batchBoundaries: batchBoundaries,
        comparedItemsBoundaries: comparedItemsBoundaries,
      },
    });

    console.log(
      itemType + " similarities batch started: INNER ",
      payloads.length
    );

    lastItemIdSeq = installedBatch[installedBatch.length - 1].id_seq;
    if (installedBatch.length !== SIMILARITIES_BATCH_SIZE) {
      lastItemIdSeq = undefined;
    }
  } while (lastItemIdSeq);

  return payloads;
}
