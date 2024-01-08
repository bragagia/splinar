import { calcWorkspaceDistantUsageDetailedAction } from "@/app/workspace/[workspaceId]/billing/calc-usage-action";
import { SubscriptionOptions } from "@/app/workspace/[workspaceId]/billing/subscription-options";
import { Database } from "@/types/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function StripeBillingPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

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
