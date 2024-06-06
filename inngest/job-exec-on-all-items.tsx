import { runDataCleaningJobOnBatch } from "@/inngest/workspace-install-jobs/exec_job";
import {
  OperationGenericMetadata,
  WorkspaceOperationUpdateStatus,
  workspaceOperationEndStepHelper,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "job-exec-on-all-items",
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
        "job-exec-on-all-items",
        event.data.error
      );
    },
  },
  { event: "job/exec-on-all-items.start" },
  async ({ event, step, logger }) => {
    const { supabaseAdmin, workspace, operation } =
      await workspaceOperationStartStepHelper<OperationGenericMetadata>(
        event.data.operationId,
        "workspace-install-jobs"
      );

    if (operation.ope_status === "QUEUED") {
      await WorkspaceOperationUpdateStatus(
        supabaseAdmin,
        operation.id,
        "PENDING"
      );
    }

    // Get all actived jobs not in error
    const { data: job, error: errorJob } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .select()
      .eq("id", event.data.dataCleaningValidatedJobId)
      .is("errored_message", null)
      .is("errored_on_item_id", null)
      .eq("errored_timeout_or_fatal", false)
      .eq("workspace_id", workspace.id)
      .limit(1)
      .single();
    if (errorJob) {
      throw errorJob;
    }

    let remainingAllowedSteps = 20;

    let areItemsRemaining = true;
    let prevLastId: number | null = null;
    while (areItemsRemaining && remainingAllowedSteps > 0) {
      let req = supabaseAdmin
        .from("items")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("item_type", job.target_item_type)
        .is("merged_in_distant_id", null)
        .limit(100)
        .order("id_seq", { ascending: true });

      if (prevLastId) {
        req = req.gt("id_seq", prevLastId);
      }

      const { data: items, error: errorItems } = await req;
      if (errorItems) {
        throw errorItems;
      }
      if (items.length === 0) {
        console.log("-> No more items to process");
        areItemsRemaining = false;
        break;
      }

      prevLastId = items[items.length - 1].id_seq;

      await runDataCleaningJobOnBatch(supabaseAdmin, workspace, job, items);

      remainingAllowedSteps--;
    }

    if (remainingAllowedSteps === 0) {
      // We reached the limit of steps, we need to restart the process
      await inngest.send({
        name: "job/exec-on-all-items.start",
        data: {
          workspaceId: workspace.id,
          operationId: operation.id,
          dataCleaningValidatedJobId: event.data.dataCleaningValidatedJobId,
        },
      });
    } else {
      await WorkspaceOperationUpdateStatus(supabaseAdmin, operation.id, "DONE");
    }

    await workspaceOperationEndStepHelper(operation, "workspace-install-jobs");
  }
);
