import { itemsMerge } from "@/app/workspace/[workspaceId]/duplicates/items-merge";
import { newHubspotClient } from "@/lib/hubspot";
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
    const { workspaceId, itemType, includePotentials, lastItemCreatedAt } =
      event.data;

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

    if (!lastItemCreatedAt) {
      // TODO: Check if there is no operation running on workspace
      // if (
      //   operation is pending
      // ) {
      //   throw new Error("Operation running on workspace");
      // }
      // const { error: error } = await supabaseAdmin
      //   .from("workspaces")
      //   .update(
      //     getItemTypeConfig(workspace, itemType).setWorkspaceOperation(
      //       "PENDING"
      //     )
      //   )
      //   .eq("id", workspaceId);
      // if (error) {
      //   throw error;
      // }
    }

    let hsClient = await newHubspotClient(workspace.refresh_token);

    let counter = 0;
    let finished = false;
    let newLastItemCreatedAt: string | null = lastItemCreatedAt || null;
    do {
      let query = supabaseAdmin
        .from("dup_stacks")
        .select("*, dup_stack_items(*, item:items(*))")
        .eq("workspace_id", workspaceId)
        .eq("item_type", itemType)
        .order("created_at", { ascending: true })
        .limit(50);

      if (newLastItemCreatedAt) {
        query = query.gt("created_at", newLastItemCreatedAt);
      }

      let { data: dupStacks, error: dupStacksError } = await query;
      if (dupStacksError) {
        throw dupStacksError;
      }
      if (!dupStacks || dupStacks.length === 0) {
        finished = true;
        break;
      }

      newLastItemCreatedAt = dupStacks[dupStacks.length - 1].created_at;

      for (let dupStack of dupStacks) {
        try {
          await itemsMerge(
            supabaseAdmin,
            workspace,
            dupStack,
            hsClient,
            includePotentials
          );
        } catch (e) {
          console.log("Merge error:", e);
        }
      }

      counter++;
    } while (newLastItemCreatedAt && counter < MAX_IT);

    if (finished) {
      // TODO: Set workspace operation to NONE
      // const { error: errorWriteDone } = await supabaseAdmin
      //   .from("workspaces")
      //   .update(
      //     getItemTypeConfig(workspace, itemType).setWorkspaceOperation("NONE")
      //   )
      //   .eq("id", workspaceId);
      // if (errorWriteDone) {
      //   throw errorWriteDone;
      // }

      logger.info("# Items merge all", workspaceId, "- END");
    } else {
      await inngest.send({
        name: "items/merge-all.start",
        data: {
          workspaceId: workspaceId,
          itemType: itemType,
          includePotentials: includePotentials,
          lastItemCreatedAt: newLastItemCreatedAt || undefined,
        },
      });

      logger.info("# Items merge all", workspaceId, "- CONTINUE");
    }
  }
);
