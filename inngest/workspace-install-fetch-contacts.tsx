import { fetchContacts } from "@/inngest/workspace-install-fetch/contacts";
import { newHubspotClient } from "@/lib/hubspot";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  WorkspaceOperationUpdateStatus,
} from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-fetch-contacts",
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

      await supabaseAdmin
        .from("workspaces")
        .update({
          installation_status: "ERROR",
        })
        .eq("id", event.data.event.data.workspaceId);
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
  { event: "workspace/install/fetch/contacts.start" },
  async ({ event, step, logger }) => {
    const { workspaceId, operationId } = event.data;

    logger.info("# Workspace contacts fetch", workspaceId);

    const supabaseAdmin = newSupabaseRootClient();

    let { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (workspaceError) {
      throw workspaceError;
    }
    if (!workspace) {
      throw new Error("Missing workspace");
    }

    let hsClient = await newHubspotClient(workspace.refresh_token);

    await fetchContacts(
      hsClient,
      supabaseAdmin,
      workspace.id,
      operationId,
      event.data.after
    );

    logger.info("# Workspace contacts fetch", workspaceId, "- END");
  }
);
