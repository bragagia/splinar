import { WorkspaceInstallSimilaritiesFastFieldStart } from "@/inngest/types";
import { getItemTypeConfig } from "@/lib/items_common";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationAddStep,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import dayjs from "dayjs";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-similarities-fast",
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
        "workspace-install-similarities-fast",
        event.data.error
      );
    },
  },
  { event: "workspace/install/similarities-fast.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper<OperationWorkspaceInstallOrUpdateMetadata>(
      event.data,
      "workspace-install-similarities-fast",
      async ({ supabaseAdmin, workspace, operation }) => {
        const { itemType } = event.data;

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

        const config = getItemTypeConfig(itemType);
        const fastFieldConfigs = config.dedupConfig.fields.filter(
          (fieldConfig) => fieldConfig.fastSimilaritiesCompatible
        );

        let payloads: WorkspaceInstallSimilaritiesFastFieldStart[] = [];
        for (const fieldConfig of fastFieldConfigs) {
          payloads.push({
            name: "workspace/install/similarities-fast/field.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              sourceNames: fieldConfig.sources,
              itemType: itemType,
              fieldConfigId: fieldConfig.id,
              matchingMethod: fieldConfig.matchingMethod,
            },
          });
        }

        await workspaceOperationAddStep<OperationWorkspaceInstallOrUpdateMetadata>(
          supabaseAdmin,
          operation.id,
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

        inngest.send(payloads);
      }
    );
  }
);
