"use server";

import { inngest } from "@/inngest";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function workspaceReset(
  workspaceId: string,
  reset: "dup_stacks" | "full" | "similarities_and_dup"
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

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
      reset: reset,
    },
  });
}
