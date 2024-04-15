import { calcWorkspaceDistantUsageDetailedAction } from "@/app/workspace/[workspaceId]/billing/calc-usage-action";
import { SubscriptionOptions } from "@/app/workspace/[workspaceId]/billing/subscription-options";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export default async function StripeBillingPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const supabase = newSupabaseServerClient();

  const workspaceUsage = await calcWorkspaceDistantUsageDetailedAction(
    params.workspaceId
  );

  return (
    <div>
      <div className="px-8 py-16 relative mt-20">
        <SubscriptionOptions
          workspaceUsage={workspaceUsage}
          currentPlan="free"
        />
      </div>
    </div>
  );
}
