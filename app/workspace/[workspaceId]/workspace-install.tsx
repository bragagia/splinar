"use server";

import { inngest } from "@/inngest";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export async function workspaceInstall(workspaceId: string) {
  const supabase = newSupabaseServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw error || new Error("missing session");
  }

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
      reset: "full",
    },
  });
}
