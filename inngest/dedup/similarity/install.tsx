import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { inngest } from "@/inngest";
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
    total += await genericCountSimilarities(
      supabase,
      workspaceId,
      isFreeTier,
      itemType
    );
  }

  console.log("Updating total batches to", total);
  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_similarities_total_batches: total,
      installation_similarities_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let payloads: { name: string; data: any }[] = [];
  for (var itemType of typesList) {
    const ret = await genericInstallSimilarities(
      supabase,
      workspaceId,
      isFreeTier,
      itemType
    );
    payloads.push(...ret);
  }

  for (let payload of payloads) {
    await inngest.send(payload as any);
  }
}

async function genericCountSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  itemType: itemTypeT
) {
  console.log("Countint", itemType);
  const { count: itemsCount, error: errorCount } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("item_type", itemType)
    .eq("workspace_id", workspaceId)
    .limit(0);
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

  return totalOperations;
}

async function genericInstallSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  itemType: itemTypeT
) {
  let batchStarted = 0;
  async function incrementBatchStarted() {
    batchStarted += 1;

    console.log(itemType + " similarities batch started: ", batchStarted);
  }

  console.log("Starting", itemType, "sim check");
  return await updateSimilarities(
    supabase,
    workspaceId,
    isFreeTier,
    itemType,
    incrementBatchStarted
  );
}
