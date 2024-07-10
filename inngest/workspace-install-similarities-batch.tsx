import {
  compareBatchWithItself,
  compareBatchesPair,
  fetchBatchItems,
} from "@/inngest/workspace-install-similarities-batch/update-batch";
import {
  workspaceOperationIncrementStepsDone,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { TablesInsert } from "@/types/supabase";
import console from "console";
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

      // we need to mark items as not sim checked
      const { workspaceId, batchIds } = event.data.event.data;

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

      // TODO: In the future, instead of stopping the whole update/install, we could simply keep that batch as failed and continue with the others
      await workspaceOperationOnFailureHelper(
        event.data.event.data.operationId,
        "workspace-install-similarities-batch",
        event.data.error
      );
    },
  },
  { event: "workspace/install/similarities/batch.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-similarities-batch",
      async ({ supabaseAdmin, workspace, operation }) => {
        const { itemType, batchIds, comparedItemsIds } = event.data;

        logger.info("### Batch:", {
          itemType,
          firstBatchId: batchIds[0],
        });

        const batch = await fetchBatchItems(
          supabaseAdmin,
          workspace.id,
          batchIds
        );

        let similarities: TablesInsert<"similarities">[];
        let itemIdsWithSims: string[] = [];

        if (!comparedItemsIds) {
          const res = await compareBatchWithItself(workspace, batch);
          similarities = res.similarities;
          itemIdsWithSims = res.itemIdsWithSims;
        } else {
          const comparedItems = await fetchBatchItems(
            supabaseAdmin,
            workspace.id,
            comparedItemsIds
          );

          const res = await compareBatchesPair(
            workspace,
            batch,
            comparedItems
          );
          similarities = res.similarities;
          itemIdsWithSims = res.itemIdsWithSims;
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
          operation.id
        );
        console.log("-> remainingBatches:", remainingBatches);

        if (remainingBatches === 0) {
          await inngest.send({
            name: "workspace/install/dupstacks.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
            },
          });
        }
      }
    );
  }
);
