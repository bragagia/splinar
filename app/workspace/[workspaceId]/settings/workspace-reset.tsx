"use server";

import { inngest } from "@/inngest";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export async function workspaceReset(
  workspaceId: string,
  reset: "dup_stacks" | "full" | "similarities_and_dup"
) {
  const supabase = newSupabaseServerClient();

  // Check for workspace access right
  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (errorWorkspace || workspace === null) {
    throw errorWorkspace || new Error("Missing workspace");
  }

  const { error: errorWorkspaceUpdate } = await supabase
    .from("workspaces")
    .update({ installation_status: "PENDING" })
    .eq("id", workspaceId);
  if (errorWorkspaceUpdate) {
    throw errorWorkspaceUpdate;
  }

  await inngest.send({
    name: "workspace/install.start",
    data: {
      workspaceId: workspaceId,
      reset: reset,
    },
  });
}
