import { acceptJobLogInternal } from "@/app/workspace/[workspaceId]/data-cleaning/review/serverAcceptJobLog";
import {
  OperationWorkspaceJobAcceptAllJobLogsMetadata,
  WorkspaceOperationUpdateStatus,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "job-accept-all-job-logs",
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
        "job-accept-all-job-logs",
        event.data.error
      );
    },
  },
  { event: "job/accept-all-job-logs.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper<OperationWorkspaceJobAcceptAllJobLogsMetadata>(
      event.data,
      "job-accept-all-job-logs",
      async ({ supabaseAdmin, workspace, operation }) => {
        const { data: job, error: errorJob } = await supabaseAdmin
          .from("data_cleaning_jobs")
          .select()
          .eq("id", event.data.dataCleaningJobId)
          .eq("workspace_id", workspace.id)
          .limit(1)
          .single();
        if (errorJob) {
          throw errorJob;
        }

        if (operation.ope_status === "QUEUED") {
          const { count, error } = await supabaseAdmin
            .from("data_cleaning_job_logs")
            .select("", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .eq("data_cleaning_job_id", job.id)
            .is("accepted_at", null)
            .is("discarded_at", null)
            .limit(0);
          if (error) {
            throw error;
          }

          await WorkspaceOperationUpdateStatus<OperationWorkspaceJobAcceptAllJobLogsMetadata>(
            supabaseAdmin,
            operation.id,
            "PENDING",
            {
              jobId: job.id,
              progress: {
                total: count || 0,
                done: 0,
              },
            }
          );
        }

        let remainingAllowedSteps = 10;

        let itemsProcessed = 0;
        let areItemsRemaining = true;
        while (areItemsRemaining && remainingAllowedSteps > 0) {
          const { data: items, error: errorItems } = await supabaseAdmin
            .from("data_cleaning_job_logs")
            .select("*, item:items(*)")
            .eq("workspace_id", workspace.id)
            .eq("data_cleaning_job_id", job.id)
            .is("accepted_at", null)
            .is("discarded_at", null)
            .limit(10);
          if (errorItems) {
            throw errorItems;
          }

          if (items.length === 0) {
            console.log("-> No more items to process");
            areItemsRemaining = false;
            break;
          }
          itemsProcessed += items.length;

          for (const item of items) {
            await acceptJobLogInternal(workspace, item);
          }

          remainingAllowedSteps--;

          await workspaceOperationUpdateMetadata<OperationWorkspaceJobAcceptAllJobLogsMetadata>(
            supabaseAdmin,
            operation.id,
            {
              progress: {
                done:
                  (operation.metadata?.progress?.done || 0) + itemsProcessed,
              },
            }
          );
        }

        if (areItemsRemaining) {
          await inngest.send({
            name: "job/accept-all-job-logs.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              dataCleaningJobId: event.data.dataCleaningJobId,
            },
          });
        } else {
          await WorkspaceOperationUpdateStatus(
            supabaseAdmin,
            operation.id,
            "DONE"
          );
        }
      }
    );
  }
);
