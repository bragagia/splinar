import { calcWorkspaceUsage } from "@/app/workspace/[workspaceId]/billing/calc-usage";
import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  WorkspaceOperationUpdateStatus,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import { getStripe } from "@/lib/stripe";
import { mailPostInstall } from "@/ressources/mails/post-install";
import dayjs from "dayjs";
import { inngest } from "./client";
import console from "console";

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
      await workspaceOperationOnFailureHelper(
        event.data.event.data.operationId,
        "workspace-install-end",
        event.data.error
      );
    },
  },
  { event: "workspace/install/end.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-end",
      async ({ supabaseAdmin, workspace, operation }) => {
        logger.info("-> Marking as done");

        const { error: error } = await supabaseAdmin
          .from("workspaces")
          .update({
            installation_status: "DONE",
          })
          .eq("id", workspace.id);
        if (error) {
          throw error;
        }

        const subscription = await getWorkspaceCurrentSubscription(
          supabaseAdmin,
          workspace.id
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
            workspace.id
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
          operation.id,
          "DONE"
        );

        if (workspace.first_installed_at === null) {
          console.log("-> Sending first install success email :tada:");

          const { error } = await supabaseAdmin
            .from("workspaces")
            .update({
              first_installed_at: dayjs().toISOString(),
            })
            .eq("id", workspace.id);
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

          const { data: user, error: errorUser } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", workspace.user_id)
            .limit(1)
            .single();
          if (errorUser) {
            throw errorUser;
          }

          await inngest.send({
            name: "send-mail.start",
            data: mailPostInstall(user, count),
          });
        }
      }
    );
  }
);
