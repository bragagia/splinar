import { installCompaniesDupStacks } from "@/inngest/dedup/dup-stacks/install";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-companies-dups-install" },
  { event: "workspace/companies/similarities/install.finished" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Workspace companies dups install", workspaceId);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!event.data.secondRun) {
      logger.info("-> Marking companies without similarities as checked");

      const { error: errorCompanies } = await supabaseAdmin.rpc(
        "mark_companies_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorCompanies) {
        throw errorCompanies;
      }
    }

    const hasMore = await installCompaniesDupStacks(supabaseAdmin, workspaceId);

    if (hasMore) {
      await inngest.send({
        name: "workspace/companies/similarities/install.finished",
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

    logger.info("# Workspace companies dups install", workspaceId, "- END");
  }
);
