"use server";

import { workspaceInstallQueueAdd } from "@/lib/queues/workspace-install";
import { WorkspaceType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function workspaceReset(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
) {
  await supabase.from("dup_stacks").delete().eq("workspace_id", workspaceId);

  await supabase
    .from("contact_similarities")
    .delete()
    .eq("workspace_id", workspaceId);

  await supabase
    .from("contact_companies")
    .delete()
    .eq("workspace_id", workspaceId);

  await supabase.from("contacts").delete().eq("workspace_id", workspaceId);

  await supabase.from("companies").delete().eq("workspace_id", workspaceId);

  let workspaceUpdate: Partial<WorkspaceType> = {
    installation_status: "FRESH",
    installation_fetched: false,
    installation_similarity_total_batches: 0,
    installation_similarity_done_batches: 0,
    installation_dup_total: 0,
    installation_dup_done: 0,
  };
  await supabase
    .from("workspaces")
    .update(workspaceUpdate)
    .eq("id", workspaceId);

  await workspaceInstallQueueAdd("workspaceInstallQueueTest", {
    userId: userId,
    workspaceId: workspaceId,
    softInstall: false,
  });
}
