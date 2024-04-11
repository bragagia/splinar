import { getItemTypeConfig } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { inngest } from "./client";

dayjs.extend(isSameOrBefore);

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
      supabaseAdmin,
      workspace,
      dayjs(startFilter),
      dayjs(endFilter),
      after
    );

    if (res.items.length > 0) {
      console.log(
        "Poll updated items distant_id: " + res.items.map((i) => i.distant_id)
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
    }

    if (res.after === "10000") {
      // We have reached the limit of the API
      // We need to continue polling, but we can't increase the page so we start a new search with the last known modified at timestamp

      const newStartFilter = res.lastItemModifiedAt
        ? dayjs(res.lastItemModifiedAt)
        : dayjs(endFilter);

      if (newStartFilter.isSameOrBefore(startFilter)) {
        captureException(
          new Error(
            "Polling limit reached with same modified date as the first element, can't get the full range of modified items, workspace will need a reset: " +
              workspaceId
          )
        ); // TODO:

        await supabaseAdmin
          .from("workspaces")
          .update({ last_poll: endFilter, polling_status: "NONE" }) // We set next poll to begin at the theoric end of the current poll and we ignore the missing data we can't get
          .eq("id", workspaceId);
      } else {
        // We start a new search with the last known modified at timestamp so the "after" parameter is reseted to zero
        await inngest.send({
          name: "workspace/polling/hubspot.start",
          data: {
            workspaceId,
            itemType,
            startFilter: newStartFilter.toISOString(),
            endFilter,
            after: undefined,
          },
        });
      }
    } else if (res.after) {
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
