import { fullFetch } from "@/inngest/workspace-install-fetch/install";
import {
  newWorkspaceOperation,
  OperationWorkspaceInstallOrUpdateMetadata,
} from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { Tables, TablesUpdate } from "@/types/supabase";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
    onFailure: async ({ event, error }) => {
      const supabaseAdmin = newSupabaseRootClient();

      await supabaseAdmin
        .from("workspaces")
        .update({
          installation_status: "ERROR",
        })
        .eq("id", event.data.event.data.workspaceId);
    },
  },
  { event: "workspace/install.start" },
  async ({ event, step, logger }) => {
    logger.info("# workspaceInstall");
    const { workspaceId, reset } = event.data;

    const supabaseAdmin = newSupabaseRootClient();

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

    const operation = await step.run("workspace-start-operation", async () => {
      return await newWorkspaceOperation<OperationWorkspaceInstallOrUpdateMetadata>(
        supabaseAdmin,
        workspaceId,
        "WORKSPACE_INSTALL",
        "PENDING",
        {
          steps: {},
        }
      );
    });

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

        if (reset === "full") {
          console.log("-> items");
          const { error: error7 } = await supabaseAdmin
            .from("items")
            .delete()
            .is("merged_in_distant_id", null)
            .eq("workspace_id", workspaceId);
          if (error7) throw error7;
        } else {
          let update: TablesUpdate<"items"> = {};

          if (reset === "dup_stacks") {
            update.dup_checked = false;
          }

          if (reset === "similarities_and_dup") {
            update.similarity_checked = false;
          }

          console.log("-> reset items status");
          const { error: error9 } = await supabaseAdmin
            .from("items")
            .update(update)
            .is("merged_in_distant_id", null)
            .eq("workspace_id", workspaceId);
          if (error9) throw error9;

          if (reset === "dup_stacks") {
            console.log("-> Marking item without similarities as dup_checked");
            const { error: error10 } = await supabaseAdmin.rpc(
              "mark_items_without_similarities_as_dup_checked",
              { workspace_id_arg: workspaceId }
            );
            if (error10) throw error10;
          }
        }
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
        await fullFetch(supabaseAdmin, workspaceId, operation.id);
      } else if (reset === "similarities_and_dup") {
        logger.info("-> Launch similarity check");

        await inngest.send({
          name: "workspace/install/similarities.start",
          data: {
            workspaceId: workspaceId,
            operationId: operation.id,
          },
        });
      } else if (reset === "dup_stacks") {
        logger.info("-> Launch dup check");
        await inngest.send({
          name: "workspace/install/dupstacks.start",
          data: {
            workspaceId: workspaceId,
            operationId: operation.id,
          },
        });
      }
    });

    logger.info("# workspaceInstall - END");
  }
);
