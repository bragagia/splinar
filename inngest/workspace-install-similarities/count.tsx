import {
  FREE_TIER_BATCH_LIMIT,
  SIMILARITIES_BATCH_SIZE,
} from "@/inngest/workspace-install-similarities/launch-workspace-similarities-batches";
import { ItemTypeT } from "@/lib/items_common";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

// Deprecated

async function countSimilaritiesBatches(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  typesList: ItemTypeT[]
) {
  let total = 0;
  for (var itemType of typesList) {
    total += await genericCountSimilarities(
      supabaseAdmin,
      workspaceId,
      isFreeTier,
      itemType
    );
  }

  return total;
}

async function genericCountSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  isFreeTier: boolean,
  itemType: ItemTypeT
) {
  console.log("Counting", itemType);
  const { count: itemsCount, error: errorCount } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("item_type", itemType)
    .eq("similarity_checked", false)
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
