import { calcWorkspaceUsage } from "@/app/workspace/[workspaceId]/billing/calc-usage";
import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  WorkspaceOperationUpdateStatus,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import { getStripe } from "@/lib/stripe";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { mailPostInstall } from "@/ressources/mails/post-install";
import dayjs from "dayjs";
import { inngest } from "./client";

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
    onFailure: async ({ event, error }) => {
      const supabaseAdmin = newSupabaseRootClient();

      const { data: operation, error: errorOperation } = await supabaseAdmin
        .from("workspace_operations")
        .select()
        .eq("id", event.data.event.data.operationId)
        .limit(1)
        .single();
      if (errorOperation || !operation) {
        throw errorOperation || new Error("missing operation");
      }

      if (operation.ope_type === "WORKSPACE_INSTALL") {
        await supabaseAdmin
          .from("workspaces")
          .update({
            installation_status: "ERROR",
          })
          .eq("id", event.data.event.data.workspaceId);
      }

      await WorkspaceOperationUpdateStatus<OperationWorkspaceInstallOrUpdateMetadata>(
        supabaseAdmin,
        event.data.event.data.operationId,
        "ERROR",
        {
          error: event.data.error,
        }
      );
    },
  },
  { event: "workspace/install/end.start" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceInstallEnd");
    const { workspaceId, operationId } = event.data;

    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("*, user:users!inner(*)")
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    logger.info("-> Marking as done");

    // Note bis: No idea why i thought that, but letting that note here for now just in case

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

    await WorkspaceOperationUpdateStatus<OperationWorkspaceInstallOrUpdateMetadata>(
      supabaseAdmin,
      operationId,
      "DONE"
    );

    if (workspace.first_installed_at === null) {
      console.log("-> Sending first install success email :tada:");

      const { error } = await supabaseAdmin
        .from("workspaces")
        .update({
          first_installed_at: dayjs().toISOString(),
        })
        .eq("id", workspaceId);
      if (error) {
        captureException(error);
      }

      const { count, error: errorDupCount } = await supabaseAdmin
        .from("dup_stack_items")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .limit(0);
      if (errorDupCount || count === null) {
        captureException(errorDupCount || new Error("missing count"));
        return;
      }

      await inngest.send({
        name: "send-mail.start",
        data: mailPostInstall(workspace.user, count),
      });
    }

    logger.info("# workspaceInstallEnd - END");
  }
);
