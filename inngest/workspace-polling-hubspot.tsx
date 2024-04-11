import { getItemTypeConfig } from "@/lib/items_common";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-polling-hubspot",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "workspace/polling/hubspot.start" },
  async ({ event, step, logger }) => {
    const { workspaceId, itemType, startFilter, endFilter, after } = event.data;

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .single();
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    if (workspace.installation_status !== "DONE") {
      console.log("Workspace not installed", workspace.id);
      return;
    }

    const itemConfig = getItemTypeConfig(itemType);

    const res = await itemConfig.pollUpdater(
      workspace,
      dayjs(startFilter),
      dayjs(endFilter),
      after
    );

    // Upsert in supabase
    const { error: errorItems } = await supabaseAdmin
      .from("items")
      .upsert(res.items, {
        onConflict: "workspace_id, item_type, distant_id",
      })
      .select(); // TODO: Remove select ? Does it still work without ?

    if (errorItems) {
      throw errorItems;
    }

    if (res.after) {
      await inngest.send({
        name: "workspace/polling/hubspot.start",
        data: {
          workspaceId,
          itemType,
          startFilter,
          endFilter,
          after: res.after,
        },
      });
    } else {
      await supabaseAdmin
        .from("workspaces")
        .update({ last_poll: endFilter, polling_status: "NONE" })
        .eq("id", workspaceId);
    }
  }
);
