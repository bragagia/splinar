"use server";

import { bulkUpdateItems, getItemTypeConfig } from "@/lib/items_common";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import dayjs from "dayjs";

export async function serverAcceptJobLog(
  workspaceId: string,
  jobLogId: string
) {
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
    .update({ accepted_at: dayjs().toISOString() })
    .eq("id", jobLogId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }
}
