import { inngest } from "@/inngest";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export const SIMILARITIES_BATCH_SIZE = 1000;

export async function updateSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  table: "contacts" | "companies",
  afterBatchCallback?: () => Promise<void>
) {
  let batchLength = 0;
  do {
    let query = supabase
      .from(table)
      .select("id, hs_id")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .order("hs_id", { ascending: true })
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

    await inngest.send({
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

    await compareBatchWithAllInstalledBatches(
      supabase,
      workspaceId,
      table,
      batchIds,
      afterBatchCallback
    );

    await markBatchInstalled(supabase, table, batchIds);
  } while (batchLength === SIMILARITIES_BATCH_SIZE && !isFreeTier);
}

async function markBatchInstalled(
  supabase: SupabaseClient<Database>,
  table: "contacts" | "companies",
  batchIds: string[]
) {
  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error } = await supabase
      .from(table)
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
  table: "contacts" | "companies",
  batchIds: string[],
  afterBatchCallback?: () => Promise<void>
) {
  let lastItemId: number | null = null;
  do {
    let query = supabase
      .from(table)
      .select("id, hs_id")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("hs_id", { ascending: true })
      .limit(SIMILARITIES_BATCH_SIZE);

    if (lastItemId) {
      query = query.gt("hs_id", lastItemId);
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

    await inngest.send({
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

    lastItemId = installedBatch[installedBatch.length - 1].hs_id;
    if (installedBatch.length !== SIMILARITIES_BATCH_SIZE) {
      lastItemId = null;
    }
  } while (lastItemId);
}
