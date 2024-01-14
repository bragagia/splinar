import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import {
  FREE_TIER_BATCH_LIMIT,
  SIMILARITIES_BATCH_SIZE,
  updateSimilarities,
} from "@/inngest/dedup/similarity/update";
import { getItemTypesList, itemTypeT } from "@/lib/items_common";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function installSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const workspaceSubscription = await getWorkspaceCurrentSubscription(
    supabase,
    workspaceId
  );

  let isFreeTier = false;
  if (!workspaceSubscription) {
    isFreeTier = true;
  }

  const typesList = getItemTypesList();

  let total = 0;
  for (var itemType of typesList) {
    total += await genericInstallSimilarities(
      supabase,
      workspaceId,
      isFreeTier,
      itemType,
      total
    );
  }
}

async function genericInstallSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  itemType: itemTypeT,
  totalOffset: number = 0
) {
  const { count: itemsCount, error: errorCount } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("item_type", itemType)
    .eq("workspace_id", workspaceId);
  if (errorCount || itemsCount === null) {
    throw errorCount || new Error("itemsCount: missing");
  }

  let limitedCount = itemsCount;
  if (
    isFreeTier &&
    limitedCount > SIMILARITIES_BATCH_SIZE * FREE_TIER_BATCH_LIMIT
  ) {
    limitedCount = SIMILARITIES_BATCH_SIZE * FREE_TIER_BATCH_LIMIT;
  }

  let batchTotal = Math.ceil(limitedCount / SIMILARITIES_BATCH_SIZE);
  let totalOperations = (batchTotal + 1) * (batchTotal / 2);

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_similarities_total_batches: totalOffset + totalOperations,
      installation_similarities_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let batchStarted = 0;
  async function incrementBatchStarted() {
    batchStarted += 1;

    console.log(itemType + " similarities batch started: ", batchStarted);
  }

  await updateSimilarities(
    supabase,
    workspaceId,
    isFreeTier,
    itemType,
    incrementBatchStarted
  );

  return totalOffset + totalOperations;
}
