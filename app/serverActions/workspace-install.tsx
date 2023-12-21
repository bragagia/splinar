"use server";

import { inngest } from "@/inngest";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function workspaceInstall(workspaceId: string) {
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

  await inngest.send({
    name: "workspace/install.start",
    data: {
      workspaceId: workspaceId,
      reset: null,
    },
  });
}
