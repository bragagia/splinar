import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import WorkspaceSettingsPageClient from "@/app/workspace/[workspaceId]/settings/pageClient";
import { Database } from "@/types/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const sub = await getWorkspaceCurrentSubscription(
    supabase,
    params.workspaceId
  );

  return <WorkspaceSettingsPageClient subscription={sub} />;
}
