"use server";
import { workspaceInstallQueueAdd } from "@/lib/queues/workspace-install";
// "use server" is needed for local dev to work as intended

import { WorkspaceType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { deferCatch } from "@/utils/dedup/defer-catch";
import { createClient } from "@supabase/supabase-js";

export async function workspaceSoftReset(
  supabaseSession: {
    refresh_token: string;
    access_token: string;
  },
  workspaceId: string
) {
  await deferCatch(async () => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.setSession(supabaseSession);
    if (error) {
      throw error;
    }

    await supabase.from("dup_stacks").delete().eq("workspace_id", workspaceId);

    await supabase
      .from("contact_similarities")
      .delete()
      .eq("workspace_id", workspaceId);

    let workspaceUpdate: Partial<WorkspaceType> = {
      installation_status: "PENDING",
      installation_similarity_total_batches: 0,
      installation_similarity_done_batches: 0,
      installation_dup_total: 0,
      installation_dup_done: 0,
    };
    await supabase
      .from("workspaces")
      .update(workspaceUpdate)
      .eq("id", workspaceId);
  });

  await workspaceInstallQueueAdd("workspaceInstallQueueTest", {
    supabaseSession,
    workspaceId,
    softInstall: true,
  });
}
