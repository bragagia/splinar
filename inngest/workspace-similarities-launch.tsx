import { installSimilarities } from "@/inngest/dedup/similarity/install";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  {
    id: "workspace-similarities-launch",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "workspace/all/fetch.finished" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceSimilaritiesLaunch");
    const { workspaceId } = event.data;

    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (errorWorkspace || !workspace) {
      throw errorWorkspace || new Error("missing workspace");
    }

    await installSimilarities(supabaseAdmin, workspaceId);

    logger.info("# workspaceSimilaritiesLaunch - END");
  }
);
