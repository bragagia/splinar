import {
  compareBatchWithItself,
  compareBatchesPair,
  fetchBatchItems,
} from "@/inngest/workspace-install-similarities-batch/update-batch";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  WorkspaceOperationUpdateStatus,
  workspaceOperationIncrementStepsDone,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { TablesInsert } from "@/types/supabase";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-similarities-batch",
    retries: 3,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: process.env.NODE_ENV === "development" ? 1 : 15,
      },
    ],
    onFailure: async ({ event, error }) => {
      const supabaseAdmin = newSupabaseRootClient();

      // !NOTE: In that failure handler, we need to mark items as not sim checked

      const batchIds = event.data.event.data.batchIds;

      for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
        const slice = batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE);

        const { error } = await supabaseAdmin
          .from("items")
          .update({ similarity_checked: false })
          .eq("workspace_id", event.data.event.data.workspaceId)
          .in("id", slice);
        if (error) {
          captureException(error);
        }
      }

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

      // TODO: In the future, instead of stopping the whole update/install, we could simply keep that batch as failed and continue with the others
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
  { event: "workspace/install/similarities/batch.start" },
  async ({ event, step, logger }) => {
    logger.info("# similaritiesBatchEval");

    const { workspaceId, operationId, itemType, batchIds, comparedItemsIds } =
      event.data;

    const supabaseAdmin = newSupabaseRootClient();

    const batch = await fetchBatchItems(supabaseAdmin, workspaceId, batchIds);

    let similarities: TablesInsert<"similarities">[];

    if (!comparedItemsIds) {
      similarities = await compareBatchWithItself(workspaceId, batch);
    } else {
      const comparedItems = await fetchBatchItems(
        supabaseAdmin,
        workspaceId,
        comparedItemsIds
      );

      similarities = await compareBatchesPair(
        workspaceId,
        batch,
        comparedItems
      );
    }

    console.log("-> Inserting similarities:", similarities.length);
    if (similarities.length > 10000) {
      console.log("-> similarities:", similarities);
    }
    let { error: errorInsert } = await supabaseAdmin
      .from("similarities")
      .insert(similarities);
    if (errorInsert) {
      throw errorInsert;
    }

    const remainingBatches = await workspaceOperationIncrementStepsDone(
      supabaseAdmin,
      operationId
    );
    console.log("-> remainingBatches:", remainingBatches);

    if (remainingBatches === 0) {
      await inngest.send({
        name: "workspace/install/dupstacks.start",
        data: {
          workspaceId: workspaceId,
          operationId: operationId,
        },
      });
    }

    logger.info("# similaritiesBatchEval - END");
  }
);
