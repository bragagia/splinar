import { fullFetch } from "@/inngest/dedup/fetch/install";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
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

        const { error: error1 } = await supabaseAdmin
          .from("dup_stack_companies")
          .delete()
          .eq("workspace_id", workspaceId);
        if (error1) throw error1;

        const { error: error2 } = await supabaseAdmin
          .from("dup_stack_contacts")
          .delete()
          .eq("workspace_id", workspaceId);
        if (error2) throw error2;

        const { error: error3 } = await supabaseAdmin
          .from("dup_stacks")
          .delete()
          .eq("workspace_id", workspaceId);
        if (error3) throw error3;

        if (reset === "full" || reset === "similarities_and_dup") {
          const { error: error4 } = await supabaseAdmin
            .from("company_similarities")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error4) throw error4;

          const { error: error5 } = await supabaseAdmin
            .from("contact_similarities")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error5) throw error5;
        }

        let workspaceUpdate: Partial<WorkspaceType> = {
          installation_companies_dup_total: 0,
          installation_companies_dup_done: 0,
          installation_contacts_dup_total: 0,
          installation_contacts_dup_done: 0,
        };

        if (reset === "full") {
          const { error: error6 } = await supabaseAdmin
            .from("contact_companies")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error6) throw error6;

          const { error: error7 } = await supabaseAdmin
            .from("contacts")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error7) throw error7;

          const { error: error8 } = await supabaseAdmin
            .from("companies")
            .delete()
            .eq("workspace_id", workspaceId);
          if (error8) throw error8;

          workspaceUpdate.installation_fetched = false;
          workspaceUpdate.installation_contacts_similarities_total_batches = 0;
          workspaceUpdate.installation_contacts_similarities_done_batches = 0;
          workspaceUpdate.installation_companies_similarities_done_batches = 0;
          workspaceUpdate.installation_companies_similarities_done_batches = 0;
          workspaceUpdate.installation_companies_total = 0;
          workspaceUpdate.installation_companies_count = 0;
          workspaceUpdate.installation_contacts_total = 0;
          workspaceUpdate.installation_contacts_count = 0;
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

            workspaceUpdate.installation_contacts_similarities_total_batches = 0;
            workspaceUpdate.installation_contacts_similarities_done_batches = 0;
            workspaceUpdate.installation_companies_similarities_done_batches = 0;
            workspaceUpdate.installation_companies_similarities_done_batches = 0;
          }

          const { error: error9 } = await supabaseAdmin
            .from("contacts")
            .update(update)
            .eq("workspace_id", workspaceId);
          if (error9) throw error9;

          const { error: error91 } = await supabaseAdmin
            .from("companies")
            .update(update)
            .eq("workspace_id", workspaceId);
          if (error91) throw error91;
        }

        const { error: error10 } = await supabaseAdmin
          .from("workspaces")
          .update(workspaceUpdate)
          .eq("id", workspaceId);
        if (error10) throw error10;
      }
    });

    await step.run("workspace-update-status", async () => {
      logger.info("-> Updating workspace status");
      let workspaceUpdatePending: Partial<WorkspaceType> = {
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
          name: "workspace/companies/similarities/install.finished",
          data: {
            workspaceId: workspaceId,
          },
        });

        await inngest.send({
          name: "workspace/contacts/similarities/install.finished",
          data: {
            workspaceId: workspaceId,
          },
        });
      }
    });

    logger.info("# workspaceInstall - END");
  }
);
