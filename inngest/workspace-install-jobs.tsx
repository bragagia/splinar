import { runDataCleaningJobOnBatch } from "@/inngest/workspace-install-jobs/exec_job";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationEndStepHelper,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import dayjs from "dayjs";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-jobs",
    retries: 3,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
    onFailure: async ({ event, error }) => {
      await workspaceOperationOnFailureHelper(
        event.data.event.data.operationId,
        "workspace-install-jobs",
        event.data.error
      );
    },
  },
  { event: "workspace/install/jobs.start" },
  async ({ event, step, logger }) => {
    const { supabaseAdmin, workspace, operation } =
      await workspaceOperationStartStepHelper(
        event.data.operationId,
        "workspace-install-jobs"
      );

    const opeMetadata =
      operation.metadata as OperationWorkspaceInstallOrUpdateMetadata;

    if (!opeMetadata.steps.jobs) {
      await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
        supabaseAdmin,
        operation.id,
        {
          steps: {
            jobs: {
              startedAt: dayjs().toISOString(),
            },
          },
        }
      );
    }

    // Get all actived jobs not in error
    const { data: jobs, error: errorJob } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .select()
      .is("deleted_at", null)
      .is("errored_message", null)
      .is("errored_on_item_id", null)
      .eq("errored_timeout_or_fatal", false)
      .eq("workspace_id", workspace.id);
    if (errorJob) {
      throw errorJob;
    }

    // Update operation with X more steps
    const onlyCreationJobs = jobs.filter(
      (job) => job.recurrence === "each-new"
    );
    const creationAndUpdateJobs = jobs.filter(
      (job) => job.recurrence === "each-new-and-updated"
    );

    let remainingAllowedSteps = 20;

    // Start with creation jobs first
    if (onlyCreationJobs.length === 0) {
      console.log("No creation jobs to execute");

      // Mark all items as executed (so when user add a job later, only new items will be processed)
      const { error: errorUpdateItems } = await supabaseAdmin
        .from("items")
        .update({
          jobs_creation_executed: true,
        })
        .eq("workspace_id", workspace.id)
        .eq("jobs_creation_executed", false);
    } else {
      let areItemsRemaining = true;
      while (areItemsRemaining && remainingAllowedSteps > 0) {
        const { data: itemsCreated, error: errorItems } = await supabaseAdmin
          .from("items")
          .select("*")
          .eq("workspace_id", workspace.id)
          .eq("jobs_creation_executed", false)
          .is("merged_in_distant_id", null)
          .limit(100);
        if (errorItems) {
          throw errorItems;
        }
        if (itemsCreated.length === 0) {
          console.log("-> No more newly created items to process");
          areItemsRemaining = false;
          break;
        }

        console.log("-> Processing", itemsCreated.length, "new items");
        for (const job of onlyCreationJobs) {
          // TODO: If one job fail, we are going to restart the process and there may be some items we process multiple times in other jobs. We should sort jobs by creation date so that the most recent job is executed first (most recent is most probable to fail)
          await runDataCleaningJobOnBatch(
            supabaseAdmin,
            workspace,
            job,
            itemsCreated
          );
        }

        // Mark those item as executed
        const { error: errorUpdateItems } = await supabaseAdmin
          .from("items")
          .update({
            jobs_creation_executed: true,
          })
          .eq("workspace_id", workspace.id)
          .in(
            "id",
            itemsCreated.map((item) => item.id)
          );

        remainingAllowedSteps--;
      }
    }

    if (creationAndUpdateJobs.length === 0) {
      console.log("No update jobs to execute");

      // Mark all items as executed (so when user add a job later, only new items will be processed)
      const { error: errorUpdateItems } = await supabaseAdmin
        .from("items")
        .update({
          jobs_update_executed: true,
        })
        .eq("workspace_id", workspace.id)
        .eq("jobs_update_executed", false);
    } else {
      // And continue with creation and update jobs
      let areItemsRemaining = true;
      while (areItemsRemaining && remainingAllowedSteps > 0) {
        const { data: itemsUpdated, error: errorItems } = await supabaseAdmin
          .from("items")
          .select("*")
          .eq("workspace_id", workspace.id)
          .eq("jobs_update_executed", false)
          .is("merged_in_distant_id", null)
          .limit(100);
        if (errorItems) {
          throw errorItems;
        }
        if (itemsUpdated.length === 0) {
          console.log("-> No more recently updated items to process");
          areItemsRemaining = false;
          break;
        }

        console.log("-> Processing", itemsUpdated.length, "updated items");
        for (const job of creationAndUpdateJobs) {
          // TODO: If one job fail, we are going to restart the process and there may be some items we process multiple times in other jobs. We should sort jobs by creation date so that the most recent job is executed first (most recent is most probable to fail)
          await runDataCleaningJobOnBatch(
            supabaseAdmin,
            workspace,
            job,
            itemsUpdated
          );
        }

        // Mark those item as executed
        const { error: errorUpdateItems } = await supabaseAdmin
          .from("items")
          .update({
            jobs_update_executed: true,
          })
          .eq("workspace_id", workspace.id)
          .in(
            "id",
            itemsUpdated.map((item) => item.id)
          );

        remainingAllowedSteps--;
      }
    }

    if (remainingAllowedSteps === 0) {
      // We reached the limit of steps, we need to restart the process
      await inngest.send({
        name: "workspace/install/jobs.start",
        data: {
          workspaceId: workspace.id,
          operationId: operation.id,
        },
      });
    } else {
      await inngest.send({
        name: "workspace/install/similarities.start",
        data: {
          workspaceId: workspace.id,
          operationId: operation.id,
        },
      });
    }

    await workspaceOperationEndStepHelper(operation, "workspace-install-jobs");
  }
);
