import { runDataCleaningJobOnSubset } from "@/inngest/data-cleaning-job-batch";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  { id: "data-cleaning-job-fulldb", retries: 0 },
  { event: "data-cleaning/job-fulldb.start" },
  async ({ event, step, logger }) => {
    const { workspaceId, jobId } = event.data;

    const supabaseAdmin = newSupabaseRootClient();

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .single();
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    const { data: job, error: errorJob } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .select()
      .eq("data_cleaning_job_id", jobId)
      .single();
    if (errorJob) {
      throw errorJob;
    }

    const { data: items, error: errorItems } = await supabaseAdmin
      .from("items")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("item_type", job.target_item_types)
      .limit(10);
    if (errorItems) {
      throw errorItems;
    }

    const itemIds = items.map((item) => item.id);

    console.log("Running on items: ", itemIds);

    await runDataCleaningJobOnSubset(
      supabaseAdmin,
      workspaceId,
      jobId,
      itemIds
    );
  }
);
