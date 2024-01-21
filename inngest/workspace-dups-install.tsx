import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/inngest/dedup/dup-stacks/install";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-dups-install", retries: 0 },
  { event: "workspace/any/similarities/install.finished" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Workspace dups install", workspaceId);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!event.data.secondRun) {
      logger.info("-> Marking items without similarities as checked");

      const { error: errorCompanies } = await supabaseAdmin.rpc(
        "mark_items_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorCompanies) {
        throw errorCompanies;
      }

      logger.info("-> Updating installation total");
      await updateDupStackInstallationTotal(supabaseAdmin, workspaceId);
    }

    const hasMore = await installDupStacks(supabaseAdmin, workspaceId);

    if (hasMore) {
      await inngest.send({
        name: "workspace/any/similarities/install.finished",
        data: {
          workspaceId: workspaceId,
          secondRun: true,
        },
      });
    } else {
      await inngest.send({
        name: "workspace/any/dups/install.finished",
        data: {
          workspaceId: workspaceId,
        },
      });
    }

    logger.info("# Workspace dups install", workspaceId, "- END");
  }
);
