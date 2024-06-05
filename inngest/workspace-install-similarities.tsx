import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { launchWorkspaceSimilaritiesBatches } from "@/inngest/workspace-install-similarities/launch-workspace-similarities-batches";
import { INNGEST_MAX_EVENT_PER_PAYLOAD } from "@/lib/inngest";
import { getItemTypesList } from "@/lib/items_common";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationAddStep,
  workspaceOperationEndStepHelper,
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

    const { supabaseAdmin, workspace, operation } =
      await workspaceOperationStartStepHelper<OperationWorkspaceInstallOrUpdateMetadata>(
        event.data.operationId,
        "workspace-install-similarities"
      );

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

    let hasMore = false;
    let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];
    for (var itemType of getItemTypesList()) {
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

    if (payloads.length === 0) {
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

    if (hasMore) {
      logger.info("More similarities to launch");

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
    for (var i = 0; i < payloads.length; i += INNGEST_MAX_EVENT_PER_PAYLOAD) {
      if (i > 0) console.log("Sending batches group ", i);

      await inngest.send(payloads.slice(i, i + INNGEST_MAX_EVENT_PER_PAYLOAD));
    }

    await workspaceOperationEndStepHelper(
      operation,
      "workspace-install-similarities"
    );
  }
);
