import { calcWorkspaceUsage } from "@/app/workspace/[workspaceId]/billing/calc-usage";
import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { getStripe } from "@/lib/stripe";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  {
    id: "workspace-install-end",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "workspace/any/dups/install.finished" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceInstallEnd");
    const { workspaceId } = event.data;

    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (errorWorkspace || !workspace) {
      throw errorWorkspace || new Error("missing workspace");
    }

    if (
      workspace.installation_similarities_done_batches ===
        workspace.installation_similarities_total_batches &&
      workspace.installation_dup_done === workspace.installation_dup_total
    ) {
      logger.info("-> Marking as done");

      // !!! Important note: there is currently no garantee that this code is not executed multiple times for a single install

      const { error: error } = await supabaseAdmin
        .from("workspaces")
        .update({
          installation_status: "DONE",
        })
        .eq("id", workspaceId);
      if (error) {
        throw error;
      }

      const subscription = await getWorkspaceCurrentSubscription(
        supabaseAdmin,
        workspaceId
      );

      if (
        subscription &&
        subscription.sub_type === "STRIPE" &&
        subscription.stripe_customer_id &&
        subscription.stripe_subscription_id &&
        subscription.stripe_subscription_item_id
      ) {
        logger.info("-> Reporting usage to stripe");
        const stripe = getStripe();
        if (!stripe) {
          throw new Error("Can't get stripe");
        }

        const workspaceUsage = await calcWorkspaceUsage(
          supabaseAdmin,
          workspaceId
        );

        await stripe.subscriptionItems.createUsageRecord(
          subscription.stripe_subscription_item_id,
          {
            quantity: workspaceUsage,
            timestamp: "now",
            action: "set",
          }
        );
      }
    } else {
      logger.info("-> Skipping");
    }

    logger.info("# workspaceInstallEnd - END");
  }
);
