import { workspaceInstallQueueAdd } from "@/lib/queues/workspace-install";
import { Database } from "@/types/supabase";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  if (!params.workspaceId || params.workspaceId === "") {
    return NextResponse.error();
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
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
    .eq("id", params.workspaceId)
    .limit(1)
    .single();
  if (errorWorkspace || workspace === null) {
    throw errorWorkspace || new Error("Missing workspace");
  }

  const { error: errorWorkspaceUpdate } = await supabase
    .from("workspaces")
    .update({ installation_status: "FRESH" })
    .eq("id", params.workspaceId);
  if (errorWorkspaceUpdate) {
    throw errorWorkspaceUpdate;
  }

  await workspaceInstallQueueAdd("workspaceInstallQueueTest", {
    workspaceId: params.workspaceId,
    reset: "full",
  });

  return NextResponse.json({});
}
