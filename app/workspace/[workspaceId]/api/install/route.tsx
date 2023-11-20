import { workspaceInstallQueue } from "@/queues/workspace-install";
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

  await workspaceInstallQueue.add("workspaceInstallQueueTest", {
    supabaseSession: {
      refresh_token: session.refresh_token,
      access_token: session.access_token,
    },
    workspaceId: params.workspaceId,
    softInstall: false,
  });

  return NextResponse.json({});
}
