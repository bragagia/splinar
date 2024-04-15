import { fetchContacts } from "@/inngest/dedup/fetch/contacts";
import { newHubspotClient } from "@/lib/hubspot";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  {
    id: "workspace-contacts-fetch",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "workspace/contacts/fetch.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

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
      event.data.after
    );

    logger.info("# Workspace contacts fetch", workspaceId, "- END");
  }
);
