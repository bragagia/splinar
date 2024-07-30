import { updateInstallItemsCount } from "@/inngest/workspace-install-fetch/install";
import { getItemTypeConfig } from "@/lib/items_common";
import {
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { WorkspaceT } from "@/lib/workspace";
import { inngest } from "./client";

const UPDATE_COUNT_EVERY = 6;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;

export default inngest.createFunction(
  {
    id: "workspace-install-fetch",
    retries: 5,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
    onFailure: async ({ event }) => {
      await workspaceOperationOnFailureHelper(
        event.data.event.data.operationId,
        "workspace-install-fetch",
        event.data.error
      );
    },
  },
  { event: "workspace/install/fetch.start" },
  async ({ event }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-fetch",
      async ({ supabaseAdmin, workspace, operation }) => {
        const { itemTypes } = event.data;
        const itemType = itemTypes[0];
        const itemConfig = getItemTypeConfig(workspace, itemType);

        let after = event.data.after;

        let pageId = 0;

        do {
          console.log(`Fetching ${itemType} page`, after);

          const { after: nextAfter, items } = await itemConfig.fetchPage(
            supabaseAdmin,
            workspace as WorkspaceT,
            after
          );
          after = nextAfter;

          if (items) {
            let { error: errorItems } = await supabaseAdmin
              .from("items")
              .upsert(items, {
                onConflict: "workspace_id,item_type,distant_id",
              });
            if (errorItems) {
              throw errorItems;
            }
          }

          pageId++;

          if (after) {
            if (pageId % UPDATE_COUNT_EVERY === 0) {
              await updateInstallItemsCount(
                supabaseAdmin,
                workspace.id,
                operation.id
              );
            }

            if (pageId % WORKER_LIMIT === 0) {
              await inngest.send({
                name: "workspace/install/fetch.start",
                data: {
                  workspaceId: workspace.id,
                  operationId: operation.id,
                  itemTypes: itemTypes,
                  after: after,
                },
              });

              return;
            }
          }
        } while (after);

        if (itemTypes.length > 1) {
          // Continue with the next item type
          await inngest.send({
            name: "workspace/install/fetch.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              itemTypes: itemTypes.slice(1),
              after: undefined,
            },
          });
        } else {
          // End of fetch operation

          // Final update
          await updateInstallItemsCount(
            supabaseAdmin,
            workspace.id,
            operation.id
          );

          await inngest.send({
            name: "workspace/install/similarities.start",
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
