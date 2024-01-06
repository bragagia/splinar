import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import { fetchContacts } from "@/inngest/dedup/fetch/contacts";

export default inngest.createFunction(
  { id: "workspace-contacts-fetch" },
  { event: "workspace/contacts/fetch.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Workspace contacts fetch", workspaceId);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
