import { installContactsDupStacks } from "@/inngest/dedup/dup-stacks/install";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-contacts-dups-install" },
  { event: "workspace/contacts/similarities/install.finished" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Workspace contacts dups install", workspaceId);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!event.data.secondRun) {
      logger.info("-> Marking contact without similarities as checked");

      const { error: errorContacts } = await supabaseAdmin.rpc(
        "mark_contacts_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorContacts) {
        throw errorContacts;
      }
    }

    const hasMore = await installContactsDupStacks(supabaseAdmin, workspaceId);

    if (hasMore) {
      await inngest.send({
        name: "workspace/contacts/similarities/install.finished",
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

    logger.info("# Workspace contacts dups install", workspaceId, "- END");
  }
);
