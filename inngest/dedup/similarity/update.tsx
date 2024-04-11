import { WorkspaceSimilaritiesBatchInstallStart } from "@/inngest/types";
import { ItemTypeT } from "@/lib/items_common";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export const SIMILARITIES_BATCH_SIZE = 1000;
export const FREE_TIER_BATCH_LIMIT = 5;

export async function updateSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  table: ItemTypeT,
  afterBatchCallback?: () => Promise<void>
) {
  let batchLength = 0;
  let count = 0;

  let payloads: WorkspaceSimilaritiesBatchInstallStart[] = [];

  do {
    let query = supabase
      .from("items")
      .select("id, distant_id")
      .is("merged_in_distant_id", null)
      .eq("item_type", table)
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
      name: "workspace/similarities/batch-install.start",
      data: {
        workspaceId: workspaceId,
        table: table,
        batchAIds: batchIds,
      },
    });

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    const payloadRet = await compareBatchWithAllInstalledBatches(
      supabase,
      workspaceId,
      table,
      batchIds,
      afterBatchCallback
    );
    payloads.push(...payloadRet);

    await markBatchInstalled(supabase, batchIds);

    count++;
  } while (
    batchLength === SIMILARITIES_BATCH_SIZE &&
    (!isFreeTier || count < FREE_TIER_BATCH_LIMIT)
  );

  return payloads;
}

async function markBatchInstalled(
  supabase: SupabaseClient<Database>,
  batchIds: string[]
) {
  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error } = await supabase
      .from("items")
      .update({ similarity_checked: true, dup_checked: false })
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error) {
      throw error;
    }
  }
}

async function compareBatchWithAllInstalledBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  table: ItemTypeT,
  batchIds: string[],
  afterBatchCallback?: () => Promise<void>
) {
  let payloads: WorkspaceSimilaritiesBatchInstallStart[] = [];

  let lastItemId: string | null = null;
  do {
    let query = supabase
      .from("items")
      .select("id, distant_id")
      .is("merged_in_distant_id", null)
      .eq("item_type", table)
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("distant_id", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    if (lastItemId) {
      query = query.gt("distant_id", lastItemId);
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
      name: "workspace/similarities/batch-install.start",
      data: {
        workspaceId: workspaceId,
        table: table,
        batchAIds: batchIds,
        batchBIds: installedBatchIds,
      },
    });

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    lastItemId = installedBatch[installedBatch.length - 1].distant_id;
    if (installedBatch.length !== SIMILARITIES_BATCH_SIZE) {
      lastItemId = null;
    }
  } while (lastItemId);

  return payloads;
}
