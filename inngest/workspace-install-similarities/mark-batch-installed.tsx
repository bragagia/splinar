import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function markBatchInstalledAndRemoveExistingSimilarities(
  supabase: SupabaseClient<Database>,
  batchIds: string[]
) {
  // TODO: Passer ça en RPC
  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const slice = batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE);

    const { error: errorA } = await supabase
      .from("similarities")
      .delete()
      .in("item_a_id", slice);
    if (errorA) {
      throw errorA;
    }

    const { error: errorB } = await supabase
      .from("similarities")
      .delete()
      .in("item_b_id", slice);
    if (errorB) {
      throw errorB;
    }

    const { error } = await supabase
      .from("items")
      .update({ similarity_checked: true })
      .in("id", slice);
    if (error) {
      throw error;
    }
  }
}
