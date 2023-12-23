import { companiesMerge } from "@/app/serverActions/companies-merge";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

const MAX_IT = 10;

export default inngest.createFunction(
  { id: "companies-merge-all" },
  { event: "companies/merge-all.start" },
  async ({ event, step, logger }) => {
    const { workspaceId } = event.data;

    logger.info("# Companies merge all", workspaceId);

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

    if (!event.data.lastItemCreatedAt) {
      if (workspace.companies_operation_status === "PENDING") {
        throw new Error("Operation running on workspace");
      }

      const { error: error } = await supabaseAdmin
        .from("workspaces")
        .update({
          companies_operation_status: "PENDING",
        })
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
        .select(
          "*, dup_stack_items:dup_stack_companies(*, company:companies(*))"
        )
        .eq("workspace_id", workspaceId)
        .eq("item_type", "COMPANIES")
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
          await companiesMerge(supabaseAdmin, workspace, dupStack, hsClient);
        } catch (e) {
          console.log("Merge error:", e);
        }
      }

      counter++;
    } while (lastItemCreatedAt && counter < MAX_IT);

    if (finished) {
      const { error: errorWriteDone } = await supabaseAdmin
        .from("workspaces")
        .update({
          companies_operation_status: "NONE",
        })
        .eq("id", workspaceId);
      if (errorWriteDone) {
        throw errorWriteDone;
      }

      logger.info("# Companies merge all", workspaceId, "- END");
    } else {
      await inngest.send({
        name: "companies/merge-all.start",
        data: {
          workspaceId: workspaceId,
          lastItemCreatedAt: lastItemCreatedAt || undefined,
        },
      });

      logger.info("# Companies merge all", workspaceId, "- CONTINUE");
    }
  }
);
