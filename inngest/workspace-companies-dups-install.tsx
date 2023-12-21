import { Database } from "@/types/supabase";
import { installCompaniesDupStacks } from "@/workers/dedup/dup-stacks/install";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-companies-dups-install" },
  { event: "workspace/companies/similarities/install.finished" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("### Workspace companies dups install", workspaceId);
    const startTime = performance.now();

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!event.data.secondRun) {
      logger.info("Marking companies without similarities as checked");

      const { error: errorCompanies } = await supabaseAdmin.rpc(
        "mark_companies_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorCompanies) {
        throw errorCompanies;
      }
    }

    logger.info(
      "### Install dup stacks",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );

    const hasMore = await installCompaniesDupStacks(supabaseAdmin, workspaceId);

    if (hasMore) {
      await inngest.send({
        name: "workspace/companies/similarities/install.finished",
        data: {
          workspaceId: workspaceId,
          secondRun: true,
        },
      });
    }
  }
);
