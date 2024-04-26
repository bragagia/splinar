import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { WorkspaceInstallSimilaritiesBatchStart } from "@/inngest/types";
import { launchWorkspaceSimilaritiesBatches } from "@/inngest/workspace-install-similarities/launch-workspace-similarities-batches";
import { getItemTypesList } from "@/lib/items_common";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationAddStep,
  workspaceOperationUpdateMetadata,
  WorkspaceOperationUpdateStatus,
} from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
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
  { event: "workspace/install/similarities.start" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceSimilaritiesLaunch");
    const { workspaceId, operationId } = event.data;

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

    await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
      supabaseAdmin,
      operationId,
      {
        steps: {
          similarities: {
            startedAt: dayjs().toISOString(),
          },
        },
      }
    );

    const workspaceSubscription = await getWorkspaceCurrentSubscription(
      supabaseAdmin,
      workspaceId
    );

    let isFreeTier = false;
    if (!workspaceSubscription) {
      isFreeTier = true;
    }

    let payloads: WorkspaceInstallSimilaritiesBatchStart[] = [];
    for (var itemType of getItemTypesList()) {
      const ret = await launchWorkspaceSimilaritiesBatches(
        supabaseAdmin,
        workspaceId,
        operationId,
        isFreeTier,
        itemType
      );
      payloads.push(...ret);
    }

    if (payloads.length === 0) {
      logger.info("No similarities to launch");

      await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
        supabaseAdmin,
        operationId,
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
          workspaceId: workspaceId,
          operationId: operationId,
        },
      });

      return;
    }

    await workspaceOperationAddStep<OperationWorkspaceInstallOrUpdateMetadata>(
      supabaseAdmin,
      operationId,
      payloads.length,
      {
        steps: {
          similarities: {
            total: payloads.length,
            batchesStartedAt: dayjs().toISOString(),
          },
        },
      }
    );

    await inngest.send(payloads);

    logger.info("# workspaceSimilaritiesLaunch - END");
  }
);
