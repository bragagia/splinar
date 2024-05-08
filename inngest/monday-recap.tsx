import { captureException } from "@/lib/sentry";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { mailMondayRecap } from "@/ressources/mails/monday-recap";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "monday-recap", retries: 0 },
  { cron: "0 14 * * 1" }, // Every Monday at 14:00 UTC
  async ({ step, logger }) => {
    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspaces, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("*, user:users!inner(*)");
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    if (workspaces.length === 0) {
      logger.info("No workspace to send monday recap");
      return;
    }

    for (const workspace of workspaces) {
      const { count, error } = await supabaseAdmin
        .from("dup_stack_items")
        .select("", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .limit(0);

      if (error) {
        captureException(error);
        continue;
      }

      if (count && count > 0) {
        await inngest.send({
          name: "send-mail.start",
          data: mailMondayRecap(workspace.user, count),
        });
      }
    }
  }
);
