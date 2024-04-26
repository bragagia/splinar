import { itemsMerge } from "@/app/workspace/[workspaceId]/duplicates/items-merge";
import { newHubspotClient } from "@/lib/hubspot";
import { getItemTypeConfig } from "@/lib/items_common";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { inngest } from "./client";

const MAX_IT = 2;

export default inngest.createFunction(
  {
    id: "workspace-items-merge-all",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
  },
  { event: "items/merge-all.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Items merge all", workspaceId);

    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (workspaceError) {
      throw workspaceError;
    }
    if (!workspace) {
      throw new Error("Missing workspace");
    }

    if (!event.data.lastItemCreatedAt) {
      if (
        getItemTypeConfig(event.data.itemType).getWorkspaceOperation(
          workspace
        ) === "PENDING"
      ) {
        throw new Error("Operation running on workspace");
      }

      const { error: error } = await supabaseAdmin
        .from("workspaces")
        .update(
          getItemTypeConfig(event.data.itemType).setWorkspaceOperation(
            "PENDING"
          )
        )
        .eq("id", workspaceId);
      if (error) {
        throw error;
      }
    }

    let hsClient = await newHubspotClient(workspace.refresh_token);

    let counter = 0;
    let finished = false;
    let lastItemCreatedAt: string | null = event.data.lastItemCreatedAt || null;
    do {
      let query = supabaseAdmin
        .from("dup_stacks")
        .select("*, dup_stack_items(*, item:items(*))")
        .eq("workspace_id", workspaceId)
        .eq("item_type", event.data.itemType)
        .order("created_at", { ascending: true })
        .limit(50);

      if (lastItemCreatedAt) {
        query = query.gt("created_at", lastItemCreatedAt);
      }

      let { data: dupStacks, error: dupStacksError } = await query;
      if (dupStacksError) {
        throw dupStacksError;
      }
      if (!dupStacks || dupStacks.length === 0) {
        finished = true;
        break;
      }

      lastItemCreatedAt = dupStacks[dupStacks.length - 1].created_at;

      for (let dupStack of dupStacks) {
        try {
          await itemsMerge(supabaseAdmin, workspace, dupStack, hsClient);
        } catch (e) {
          console.log("Merge error:", e);
        }
      }

      counter++;
    } while (lastItemCreatedAt && counter < MAX_IT);

    if (finished) {
      const { error: errorWriteDone } = await supabaseAdmin
        .from("workspaces")
        .update(
          getItemTypeConfig(event.data.itemType).setWorkspaceOperation("NONE")
        )
        .eq("id", workspaceId);
      if (errorWriteDone) {
        throw errorWriteDone;
      }

      logger.info("# Items merge all", workspaceId, "- END");
    } else {
      await inngest.send({
        name: "items/merge-all.start",
        data: {
          workspaceId: workspaceId,
          itemType: event.data.itemType,
          lastItemCreatedAt: lastItemCreatedAt || undefined,
        },
      });

      logger.info("# Items merge all", workspaceId, "- CONTINUE");
    }
  }
);
