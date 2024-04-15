import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import WorkspaceSettingsPageClient from "@/app/workspace/[workspaceId]/settings/pageClient";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const supabase = newSupabaseServerClient();

  const sub = await getWorkspaceCurrentSubscription(
    supabase,
    params.workspaceId
  );

  return <WorkspaceSettingsPageClient subscription={sub} />;
}
