import { installSimilarities } from "@/inngest/dedup/similarity/install";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

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

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
