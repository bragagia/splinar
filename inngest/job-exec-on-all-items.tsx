import { runDataCleaningJobOnBatch } from "@/inngest/workspace-install-jobs/exec_job";
import {
  OperationWorkspaceJobExecOnAllMetadata,
  WorkspaceOperationUpdateStatus,
  workspaceOperationEndStepHelper,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "job-exec-on-all-items",
    retries: 1,
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
      await workspaceOperationStartStepHelper<OperationWorkspaceJobExecOnAllMetadata>(
        event.data.operationId,
        "job-exec-on-all-items"
      );

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

    if (operation.ope_status === "QUEUED") {
      const { count, error } = await supabaseAdmin
        .from("items")
        .select("", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("item_type", job.target_item_type)
        .is("merged_in_distant_id", null)
        .limit(0);
      if (error) {
        throw error;
      }

      await WorkspaceOperationUpdateStatus<OperationWorkspaceJobExecOnAllMetadata>(
        supabaseAdmin,
        operation.id,
        "PENDING",
        {
          progress: {
            total: count || 0,
            done: 0,
          },
        }
      );
    }

    let remainingAllowedSteps = 20;

    let itemsProcessed = 0;
    let areItemsRemaining = true;
    let prevLastIdSeq: number | null = event.data.lastItemIdSeq || null;
    while (areItemsRemaining && remainingAllowedSteps > 0) {
      let req = supabaseAdmin
        .from("items")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("item_type", job.target_item_type)
        .is("merged_in_distant_id", null)
        .limit(100)
        .order("id_seq", { ascending: true });

      if (prevLastIdSeq) {
        req = req.gt("id_seq", prevLastIdSeq);
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
      itemsProcessed += items.length;

      prevLastIdSeq = items[items.length - 1].id_seq;

      await runDataCleaningJobOnBatch(supabaseAdmin, workspace, job, items);

      remainingAllowedSteps--;
    }

    await workspaceOperationUpdateMetadata<OperationWorkspaceJobExecOnAllMetadata>(
      supabaseAdmin,
      operation.id,
      {
        progress: {
          done: (operation.metadata?.progress?.done || 0) + itemsProcessed,
        },
      }
    );

    if (remainingAllowedSteps === 0 && prevLastIdSeq !== null) {
      // We reached the limit of steps, we need to restart the process
      await inngest.send({
        name: "job/exec-on-all-items.start",
        data: {
          workspaceId: workspace.id,
          operationId: operation.id,
          dataCleaningValidatedJobId: event.data.dataCleaningValidatedJobId,
          lastItemIdSeq: prevLastIdSeq,
        },
      });
    } else {
      await WorkspaceOperationUpdateStatus(supabaseAdmin, operation.id, "DONE");
    }

    await workspaceOperationEndStepHelper(operation, "job-exec-on-all-items");
  }
);
