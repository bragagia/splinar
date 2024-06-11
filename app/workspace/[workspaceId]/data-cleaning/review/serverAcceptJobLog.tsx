"use server";

import { bulkUpdateItems, getItemTypeConfig } from "@/lib/items_common";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import dayjs from "dayjs";

export async function acceptJobLogSA(workspaceId: string, jobLogId: string) {
  const supabase = newSupabaseServerClient();

  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();
  if (errorWorkspace) {
    throw errorWorkspace;
  }

  const supabaseAdmin = newSupabaseRootClient(); // Only after checking we have access rights to workspace

  const { data: jobLog, error: errorJobLog } = await supabaseAdmin
    .from("data_cleaning_job_logs")
    .select("*, item:items(*)")
    .eq("id", jobLogId)
    .eq("workspace_id", workspaceId)
    .single();
  if (errorJobLog) {
    throw errorJobLog;
  }
  if (jobLog.item === null) {
    throw new Error("Job log item not found");
  }
  if (jobLog.accepted_at !== null) {
    throw new Error("Job log already accepted");
  }

  const itemTypeConfig = getItemTypeConfig(jobLog.item.item_type);

  const jobOutput = {
    [jobLog.item.id]: {
      id: jobLog.item.id,
      distantId: jobLog.item.distant_id,
      Prev: jobLog.prev_value as { [key: string]: string | null | undefined },
      Next: jobLog.new_value as { [key: string]: string | null | undefined },
    },
  };

  await itemTypeConfig.distantUpdateBulk(workspace, jobOutput);

  await bulkUpdateItems(
    supabaseAdmin,
    workspace,
    jobLog.item.item_type,
    jobOutput
  );

  const { error } = await supabaseAdmin
    .from("data_cleaning_job_logs")
    .update({ accepted_at: dayjs().toISOString(), discarded_at: null })
    .eq("id", jobLogId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }
}

export async function discardJobLogSA(workspaceId: string, jobLogId: string) {
  const supabase = newSupabaseServerClient();

  const { data: jobLog, error: errorJobLog } = await supabase
    .from("data_cleaning_job_logs")
    .select("*")
    .eq("id", jobLogId)
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single();
  if (errorJobLog) {
    throw errorJobLog;
  }
  if (jobLog.accepted_at !== null || jobLog.discarded_at !== null) {
    throw new Error("Job log already accepted or discarded");
  }

  const supabaseAdmin = newSupabaseRootClient(); // Only after checking we have access rights to workspace

  const { error } = await supabaseAdmin
    .from("data_cleaning_job_logs")
    .update({ discarded_at: dayjs().toISOString() })
    .eq("id", jobLogId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }
}

export async function discardAllJobLogsSA(workspaceId: string, jobId: string) {
  const supabase = newSupabaseServerClient();

  const { data: job, error: errorJobLogs } = await supabase
    .from("data_cleaning_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("workspace_id", workspaceId);
  if (errorJobLogs) {
    throw errorJobLogs;
  }

  const supabaseAdmin = newSupabaseRootClient(); // Only after checking we have access rights to workspace

  const { error } = await supabaseAdmin
    .from("data_cleaning_job_logs")
    .update({ discarded_at: dayjs().toISOString() })
    .eq("data_cleaning_job_id", jobId)
    .is("accepted_at", null)
    .is("discarded_at", null)
    .eq("workspace_id", workspaceId);
  if (error) {
    throw error;
  }
}
