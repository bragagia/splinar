import { contactMerge } from "@/app/serverActions/contacts-merge";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "contacts-merge-all" },
  { event: "contacts/merge-all.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Contact merge all", workspaceId);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    const { error: error } = await supabaseAdmin
      .from("workspaces")
      .update({
        contacts_operation_status: "PENDING",
      })
      .eq("id", workspaceId);
    if (error) {
      throw error;
    }

    let hsClient = await newHubspotClient(workspace.refresh_token);

    let lastItemCreatedAt: string | null = null;
    do {
      let query = supabaseAdmin
        .from("dup_stacks")
        .select(
          "*, dup_stack_items:dup_stack_contacts(*, contact:contacts(*, companies(*)))"
        )
        .eq("workspace_id", workspaceId)
        .eq("item_type", "CONTACTS")
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
        break;
      }

      lastItemCreatedAt = dupStacks[dupStacks.length - 1].created_at;

      await Promise.all(
        dupStacks.map(async (dupStack) => {
          try {
            await contactMerge(supabaseAdmin, workspace, dupStack, hsClient);
          } catch (e) {
            console.log("Merge error:", e);
          }
        })
      );
    } while (lastItemCreatedAt);

    // TODO: cap this endpoint to 40s max and then start again with another call

    const { error: errorWriteDone } = await supabaseAdmin
      .from("workspaces")
      .update({
        contacts_operation_status: "NONE",
      })
      .eq("id", workspaceId);
    if (errorWriteDone) {
      throw errorWriteDone;
    }

    logger.info("# Contacts merge all", workspaceId, "- END");
  }
);
