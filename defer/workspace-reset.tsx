"use server";
// "use server" is needed for local dev to work as intended

import workspaceInstall from "@/defer/workspace-install";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/utils/database-types";
import { deferCatch } from "@/utils/dedup/defer-catch";
import { defer } from "@defer/client";
import { createClient } from "@supabase/supabase-js";

async function workspaceReset(
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

    await supabase
      .from("hs_dup_stacks")
      .delete()
      .eq("workspace_id", workspaceId);

    await supabase
      .from("hs_contact_similarities")
      .delete()
      .eq("workspace_id", workspaceId);

    await supabase
      .from("hs_contact_companies")
      .delete()
      .eq("workspace_id", workspaceId);

    await supabase.from("hs_contacts").delete().eq("workspace_id", workspaceId);

    await supabase
      .from("hs_companies")
      .delete()
      .eq("workspace_id", workspaceId);

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
  });

  await workspaceInstall(supabaseSession, workspaceId);
}

export default defer(workspaceReset);
