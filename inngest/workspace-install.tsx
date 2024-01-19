import { fullFetch } from "@/inngest/dedup/fetch/install";
import { Database, Tables } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "workspace-install" },
  { event: "workspace/install.start" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceInstall");
    const { workspaceId, reset } = event.data;

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace0, error: error0 } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (error0 || !workspace0) {
      throw error0 || new Error("missing workspace");
    }

    const shouldStop = await step.run("workspace-check-status", async () => {
      if (
        workspace0.installation_status !== "PENDING" &&
        workspace0.installation_status !== "ERROR"
      ) {
        console.log("Workspace install must start on a pending state");
        // TODO: do error case
        // TODO: Use inngest anti-concurrency instead ?
        // TODO: note: currently it is not conccurent safe
        return true;
      }
    });
    if (shouldStop) {
      return;
    }

    await step.run("workspace-reset", async () => {
      if (reset) {
        logger.info("-> reset -", reset);

        console.log("-> dup_stack_items");
        const { error: error1 } = await supabaseAdmin
          .from("dup_stack_items")
          .delete()
          .eq("workspace_id", workspaceId);
        if (error1) throw error1;

        console.log("-> dup_stacks");
        const { error: error3 } = await supabaseAdmin
          .from("dup_stacks")
          .delete()
          .eq("workspace_id", workspaceId);
        if (error3) throw error3;

        if (reset === "full" || reset === "similarities_and_dup") {
          console.log("-> similarities");
          const { error: error4 } = await supabaseAdmin
            .from("similarities")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error4) throw error4;
        }

        let workspaceUpdate: Partial<Tables<"workspaces">> = {
          installation_dup_total: 0,
          installation_dup_done: 0,
        };

        if (reset === "full") {
          console.log("-> items");
          const { error: error7 } = await supabaseAdmin
            .from("items")
            .delete()
            .is("merged_in_distant_id", null)
            .eq("workspace_id", workspaceId);
          if (error7) throw error7;

          workspaceUpdate.installation_fetched = false;
          workspaceUpdate.installation_similarities_total_batches = 0;
          workspaceUpdate.installation_similarities_done_batches = 0;
          workspaceUpdate.installation_items_total = 0;
          workspaceUpdate.installation_items_count = 0;
        } else {
          let update: {
            dup_checked: boolean;
            similarity_checked: boolean | undefined;
          } = {
            dup_checked: false,
            similarity_checked: undefined,
          };

          if (reset === "similarities_and_dup") {
            update.similarity_checked = false;

            workspaceUpdate.installation_similarities_total_batches = 0;
            workspaceUpdate.installation_similarities_done_batches = 0;
          }

          console.log("-> reset items status");
          const { error: error9 } = await supabaseAdmin
            .from("items")
            .update(update)
            .is("merged_in_distant_id", null)
            .eq("workspace_id", workspaceId);
          if (error9) throw error9;
        }

        console.log("-> update workspace");
        const { error: error10 } = await supabaseAdmin
          .from("workspaces")
          .update(workspaceUpdate)
          .eq("id", workspaceId);
        if (error10) throw error10;
      }
    });

    await step.run("workspace-update-status", async () => {
      logger.info("-> Updating workspace status");
      let workspaceUpdatePending: Partial<Tables<"workspaces">> = {
        installation_status: "INSTALLING",
      };
      const { error: error1 } = await supabaseAdmin
        .from("workspaces")
        .update(workspaceUpdatePending)
        .eq("id", workspaceId);
      if (error1) throw error1;
    });

    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .limit(1)
      .single();
    if (error || !workspace) {
      throw error || new Error("missing workspace");
    }

    await step.run("workspace-install-launch", async () => {
      if (!reset || reset === "full") {
        // TODO: We check for installation fetched because the fetch function is not self aware if the data it fetch is already in db or not
        if (!workspace.installation_fetched) {
          logger.info("-> Fetching hubspot data");

          await fullFetch(supabaseAdmin, workspaceId);
        } else {
          logger.info("-> Launch similarity check");

          await inngest.send({
            name: "workspace/all/fetch.finished",
            data: {
              workspaceId: workspaceId,
            },
          });
        }
      } else if (reset === "similarities_and_dup") {
        logger.info("-> Launch similarity check");

        await inngest.send({
          name: "workspace/all/fetch.finished",
          data: {
            workspaceId: workspaceId,
          },
        });
      } else if (reset === "dup_stacks") {
        logger.info("-> Launch dup check");
        await inngest.send({
          name: "workspace/any/similarities/install.finished",
          data: {
            workspaceId: workspaceId,
          },
        });
      }
    });

    logger.info("# workspaceInstall - END");
  }
);
