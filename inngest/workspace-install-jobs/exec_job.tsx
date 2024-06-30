"use server";

import {
  getJobFunction,
  runCodeJobOnItems,
} from "@/inngest/workspace-install-jobs/job_helpers";
import {
  JobOutputByItemId,
  bulkUpdateItems,
  getItemTypeConfig,
} from "@/lib/items_common";
import { rawsql } from "@/lib/supabase/raw_sql";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

export async function runDataCleaningJobOnBatch(
  supabaseAdmin: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  jobValidated: Tables<"data_cleaning_job_validated">,
  items: Tables<"items">[]
) {
  // Keep only items targeted by job
  const filteredItems = items.filter(
    (item) => item.item_type === jobValidated.target_item_type
  );

  console.log(
    "### runDataCleaningJobOnBatch",
    jobValidated.id,
    "on",
    filteredItems.length,
    "items"
  );

  if (filteredItems.length === 0) {
    return;
  }

  const itemConfig = getItemTypeConfig(jobValidated.target_item_type);

  // Set job as errored (so that event if it timeout of crash, it will be errored correclty)
  const { error: errorJobUpdate } = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .update({
      errored_timeout_or_fatal: true,
    })
    .eq("id", jobValidated.id);
  if (errorJobUpdate) {
    throw errorJobUpdate;
  }

  try {
    const jobFunction = getJobFunction(jobValidated.code);

    const jobOutput = runCodeJobOnItems(filteredItems, jobFunction);

    await createJobLogs(
      workspace.id,
      jobValidated,
      jobOutput,
      jobValidated.auto_accept_changes
    );

    if (jobValidated.auto_accept_changes) {
      await itemConfig.distantUpdateBulk(workspace, jobOutput);

      await bulkUpdateItems(
        supabaseAdmin,
        workspace.id,
        jobValidated.target_item_type,
        jobOutput
      );
    }

    // If we came here, it means the job was successful, remove the errored flag
    const { error: errorJobUpdate } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .update({
        errored_timeout_or_fatal: false,
      })
      .eq("id", jobValidated.id);
    if (errorJobUpdate) {
      throw errorJobUpdate;
    }
  } catch (e: any) {
    await supabaseAdmin
      .from("data_cleaning_job_validated")
      .update({
        errored_timeout_or_fatal: false,
        errored_message: e.message,
      })
      .eq("id", jobValidated.id);

    throw e;
  }
}

async function createJobLogs(
  workspaceId: string,
  jobValidated: Tables<"data_cleaning_job_validated">,
  jobOutput: JobOutputByItemId,
  autoAcceptChanges: boolean
) {
  const acceptedAt = autoAcceptChanges ? dayjs().toISOString() : null;

  let jobLogs = Object.keys(jobOutput).map((itemId) => {
    const log: TablesInsert<"data_cleaning_job_logs"> = {
      workspace_id: workspaceId,
      data_cleaning_job_id: jobValidated.data_cleaning_job_id,
      data_cleaning_job_validated_id: jobValidated.id,
      item_id: itemId,
      item_type: jobValidated.target_item_type,
      prev_value: jobOutput[itemId].Prev || {},
      new_value: jobOutput[itemId].Next,
      accepted_at: acceptedAt,
    };

    return log;
  });

  await rawsql(
    `
    INSERT INTO data_cleaning_job_logs
    $1
    ON CONFLICT (workspace_id, data_cleaning_job_id, item_id)
    WHERE accepted_at IS NULL AND discarded_at IS NULL
    DO UPDATE SET prev_value = EXCLUDED.prev_value, new_value = EXCLUDED.new_value, accepted_at = EXCLUDED.accepted_at
    `,
    jobLogs
  );
}
