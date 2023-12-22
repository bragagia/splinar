import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-install-end" },
  { event: "workspace/any/dups/install.finished" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceInstallEnd");
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

    if (workspace.installation_dup_done === workspace.installation_dup_total) {
      logger.info("-> Marking as done");

      // !!! Important note: there is currently no garantee that this code is not executed multiple times for a single install

      const { error: error } = await supabaseAdmin
        .from("workspaces")
        .update({
          installation_status: "DONE",
        })
        .eq("id", workspaceId);
      if (error) {
        throw error;
      }
    } else {
      logger.info("-> Skipping");
    }

    logger.info("# workspaceInstallEnd - END");
  }
);
