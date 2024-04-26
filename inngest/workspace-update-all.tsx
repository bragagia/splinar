import { getItemTypesList } from "@/lib/items_common";
import {
  newWorkspaceOperation,
  OperationWorkspaceInstallOrUpdateMetadata,
} from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import dayjs from "dayjs";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-update-all", retries: 0 },
  [
    { cron: "0-59/30 * * * *" }, // TZ=Europe/Paris
    { event: "workspace/update/all.start" },
  ],
  async ({ step, logger }) => {
    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspaces, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, last_poll, created_at")
      .eq("installation_status", "DONE")
      .eq("polling_status", "NONE"); // TODO: Where paid
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    const { error: errorUpdate } = await supabaseAdmin
      .from("workspaces")
      .update({
        polling_status: "PENDING",
      })
      .in(
        "id",
        workspaces.map((w) => w.id)
      );
    if (errorUpdate) {
      throw errorUpdate;
    }

    const endOfPoll = dayjs().add(-30, "seconds").toISOString(); // We subtract 30 seconds because hubspot doesn't refresh the lastmodifieddate instantly and we don't want to miss any data

    const itemTypes = getItemTypesList();

    // For each
    for (const workspace of workspaces) {
      const operation =
        await newWorkspaceOperation<OperationWorkspaceInstallOrUpdateMetadata>(
          supabaseAdmin,
          workspace.id,
          "WORKSPACE_UPDATE",
          "PENDING",
          {
            steps: {
              polling: {
                startedAt: dayjs().toISOString(),
                total: itemTypes.length,
              },
            },
          },
          itemTypes.length
        );

      for (const itemType of itemTypes) {
        await inngest.send({
          name: "workspace/update/polling/hubspot.start",
          data: {
            workspaceId: workspace.id,
            operationId: operation.id,
            itemType: itemType,
            startFilter: workspace.last_poll || workspace.created_at,
            endFilter: endOfPoll,
          },
        });
      }
    }
  }
);
