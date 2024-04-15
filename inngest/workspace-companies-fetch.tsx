import { fetchCompanies } from "@/inngest/dedup/fetch/companies";
import { newHubspotClient } from "@/lib/hubspot";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  {
    id: "workspace-companies-fetch",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "workspace/companies/fetch.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Workspace companies fetch", workspaceId);

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

    await fetchCompanies(
      hsClient,
      supabaseAdmin,
      workspace.id,
      event.data.after
    );

    logger.info("# Workspace companies fetch", workspaceId, "- END");
  }
);
