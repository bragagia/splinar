import { getItemTypeConfig } from "@/lib/items_common";
import {
  workspaceOperationIncrementStepsDone,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { inngest } from "./client";
import console from "console";

dayjs.extend(isSameOrBefore);

export default inngest.createFunction(
  {
    id: "workspace-update-polling-hubspot",
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
        "workspace-update-polling-hubspot",
        event.data.error
      );
    },
  },
  { event: "workspace/update/polling/hubspot.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-update-polling-hubspot",
      async ({ supabaseAdmin, workspace, operation }) => {
        const { itemType, startFilter, endFilter, after } = event.data;

        if (workspace.installation_status !== "DONE") {
          console.log("Workspace not installed", workspace.id);
          return;
        }

        const itemConfig = getItemTypeConfig(itemType);

        const res = await itemConfig.pollUpdater(
          supabaseAdmin,
          workspace,
          dayjs(startFilter),
          dayjs(endFilter),
          after
        );

        if (res.items.length > 0) {
          console.log(
            "Poll updated items distant_id: " +
              res.items.map((i) => i.distant_id)
          );

          // Upsert in supabase
          const { error: errorItems } = await supabaseAdmin
            .from("items")
            .upsert(res.items, {
              onConflict: "workspace_id, item_type, distant_id",
            })
            .select(); // TODO: Remove select ? Does it still work without ?

          if (errorItems) {
            throw errorItems;
          }
        } else {
          console.log("No items to update");
        }

        if (res.after === "10000") {
          // We have reached the limit of the API
          // We need to continue polling, but we can't increase the page so we start a new search with the last known modified at timestamp

          const newStartFilter = res.lastItemModifiedAt
            ? dayjs(res.lastItemModifiedAt)
            : dayjs(endFilter);

          console.log(
            "Polling limit reached, starting new search with new start filter: " +
              newStartFilter.toISOString()
          );

          if (newStartFilter.isSameOrBefore(startFilter)) {
            captureException(
              new Error(
                "Polling limit reached with same modified date as the first element, can't get the full range of modified items, workspace will need a reset: " +
                  workspace.id
              )
            ); // TODO:

            await supabaseAdmin
              .from("workspaces")
              .update({ last_poll: endFilter, polling_status: "NONE" }) // We set next poll to begin at the theoric end of the current poll and we ignore the missing data we can't get
              .eq("id", workspace.id);
          } else {
            // We start a new search with the last known modified at timestamp so the "after" parameter is reseted to zero
            await inngest.send({
              name: "workspace/update/polling/hubspot.start",
              data: {
                workspaceId: workspace.id,
                operationId: operation.id,
                itemType,
                startFilter: newStartFilter.toISOString(),
                endFilter,
                after: undefined,
              },
            });
          }
        } else if (res.after) {
          console.log("Polling continue with after: " + res.after);

          await inngest.send({
            name: "workspace/update/polling/hubspot.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              itemType,
              startFilter,
              endFilter,
              after: res.after,
            },
          });
        } else {
          console.log("Polling last step");

          const remaining = await workspaceOperationIncrementStepsDone(
            supabaseAdmin,
            operation.id
          );

          if (remaining === 0) {
            await inngest.send({
              name: "workspace/install/jobs.start",
              data: {
                workspaceId: workspace.id,
                operationId: operation.id,
              },
            });
          }

          await supabaseAdmin
            .from("workspaces")
            .update({ last_poll: endFilter, polling_status: "NONE" })
            .eq("id", workspace.id);
        }
      }
    );
  }
);
