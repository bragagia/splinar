import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { launchWorkspaceSimilaritiesBatches } from "@/inngest/workspace-install-similarities/launch-workspace-similarities-batches";
import { INNGEST_MAX_EVENT_PER_PAYLOAD } from "@/lib/inngest";
import { getItemTypesList } from "@/lib/items_common";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationAddStep,
  workspaceOperationIncrementStepsDone,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import dayjs from "dayjs";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-similarities",
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
        "workspace-install-similarities",
        event.data.error
      );
    },
  },
  { event: "workspace/install/similarities.start" },
  async ({ event, step, logger }) => {
    const { secondRun } = event.data;

    await workspaceOperationStartStepHelper<OperationWorkspaceInstallOrUpdateMetadata>(
      event.data,
      "workspace-install-similarities",
      async ({ supabaseAdmin, workspace, operation }) => {
        if (!secondRun) {
          await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
            supabaseAdmin,
            operation.id,
            {
              steps: {
                similarities: {
                  startedAt: dayjs().toISOString(),
                },
              },
            }
          );
        }

        const workspaceSubscription = await getWorkspaceCurrentSubscription(
          supabaseAdmin,
          workspace.id
        );

        let isFreeTier = false;
        if (!workspaceSubscription) {
          isFreeTier = true;
        }

        let oneHasBeenFastRan = false;
        let hasMore = false;
        let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];
        for (var itemType of getItemTypesList()) {
          let hasBeenFastRan = false;
          if (!isFreeTier) {
            // console.log("Paying tier, checking if need to fast run");

            // const { count, error } = await supabaseAdmin
            //   .from("items")
            //   .select("", { count: "exact", head: true })
            //   .eq("workspace_id", workspace.id)
            //   .eq("item_type", itemType)
            //   .is("merged_in_distant_id", null)
            //   .limit(0);
            // if (error || count === null) {
            //   throw error || new Error("missing count");
            // }

            //if (count > 80000) {
            // TODO: should do slow run if less than 10k items to reduce costs
            hasBeenFastRan = true;
            oneHasBeenFastRan = true;

            if (!secondRun) {
              await inngest.send({
                name: "workspace/install/similarities-fast.start",
                data: {
                  workspaceId: workspace.id,
                  operationId: operation.id,
                  itemType: itemType,
                },
              });
            }
            //}
          }

          if (!hasBeenFastRan) {
            const { hasMore: hasMoreOfItemType, payloads: payloadsOfItemType } =
              await launchWorkspaceSimilaritiesBatches(
                supabaseAdmin,
                workspace.id,
                operation.id,
                isFreeTier,
                itemType
              );

            payloads.push(...payloadsOfItemType);

            if (hasMoreOfItemType) {
              hasMore = true;
            }
          }
        }

        if (payloads.length === 0 && !oneHasBeenFastRan) {
          logger.info("No similarities to launch");

          await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
            supabaseAdmin,
            operation.id,
            {
              steps: {
                similarities: {
                  total: 0,
                },
              },
            }
          );

          await inngest.send({
            name: "workspace/install/dupstacks.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
            },
          });

          return;
        }

        await workspaceOperationAddStep<OperationWorkspaceInstallOrUpdateMetadata>(
          supabaseAdmin,
          operation.id,
          payloads.length,
          {
            steps: {
              similarities: {
                total:
                  payloads.length +
                  (operation.metadata.steps.similarities?.total || 0),
                batchesStartedAt: dayjs().toISOString(),
              },
            },
          }
        );

        if (secondRun) {
          // We had incremented the steps done previously in the "has more" clause just below
          await workspaceOperationIncrementStepsDone(
            supabaseAdmin,
            operation.id
          );
        }

        if (hasMore) {
          logger.info("More similarities to launch");

          await workspaceOperationAddStep<OperationWorkspaceInstallOrUpdateMetadata>(
            supabaseAdmin,
            operation.id,
            1
          );

          await inngest.send({
            name: "workspace/install/similarities.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              secondRun: true,
            },
          });
        }

        console.log("Sending", payloads.length, "batches");
        for (
          var i = 0;
          i < payloads.length;
          i += INNGEST_MAX_EVENT_PER_PAYLOAD
        ) {
          if (i > 0) console.log("Sending batches group ", i);

          await inngest.send(
            payloads.slice(i, i + INNGEST_MAX_EVENT_PER_PAYLOAD)
          );
        }
      }
    );
  }
);
