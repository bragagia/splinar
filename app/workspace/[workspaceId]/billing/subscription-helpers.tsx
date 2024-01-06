import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function getWorkspaceCurrentSubscription(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { data: workspaceSubscription } = await supabase
    .from("workspace_subscriptions")
    .select()
    .eq("workspace_id", workspaceId)
    .or(`canceled_at.is.null,canceled_at.gte.NOW()`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Note: we ignore error because if error -> No subscription
  return workspaceSubscription;
}
