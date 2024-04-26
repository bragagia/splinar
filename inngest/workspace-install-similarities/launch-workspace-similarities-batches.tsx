import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { markBatchInstalledAndRemoveExistingSimilarities } from "@/inngest/workspace-install-similarities/mark-batch-installed";
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
  let count = 0;

  let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];

  do {
    let query = supabase
      .from("items")
      .select("id, distant_id")
      .is("merged_in_distant_id", null)
      .eq("item_type", itemType)
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .order("distant_id", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    const { data: batch, error: error } = await query;
    if (error) {
      throw error;
    }
    if (!batch || batch.length === 0) {
      break;
    }
    batchLength = batch.length;

    const batchIds = batch.map((o) => o.id);

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

    const payloadRet = await compareBatchWithAllInstalledBatches(
      supabase,
      workspaceId,
      operationId,
      itemType,
      batchIds
    );
    payloads.push(...payloadRet);

    await markBatchInstalledAndRemoveExistingSimilarities(supabase, batchIds);

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
  batchIds: string[]
) {
  let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];

  let lastItemDistantId: string | null = null;
  do {
    let query = supabase
      .from("items")
      .select("id, distant_id")
      .is("merged_in_distant_id", null)
      .eq("item_type", itemType)
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("distant_id", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    if (lastItemDistantId) {
      query = query.gt("distant_id", lastItemDistantId);
    }

    const { data: installedBatch, error: errorInstalledBatch } = await query;
    if (errorInstalledBatch) {
      console.log("errorInstalledBatch", errorInstalledBatch);
      break;
    }
    if (!installedBatch || installedBatch.length === 0) {
      break;
    }

    const installedBatchIds = installedBatch.map((o) => o.id);

    payloads.push({
      name: "workspace/install/similarities/batch.start",
      data: {
        workspaceId: workspaceId,
        operationId: operationId,
        itemType: itemType,
        batchIds: batchIds,
        comparedItemsIds: installedBatchIds,
      },
    });

    console.log(
      itemType + " similarities batch started: INNER ",
      payloads.length
    );

    lastItemDistantId = installedBatch[installedBatch.length - 1].distant_id;
    if (installedBatch.length !== SIMILARITIES_BATCH_SIZE) {
      lastItemDistantId = null;
    }
  } while (lastItemDistantId);

  return payloads;
}
