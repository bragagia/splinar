"use server";

import { inngest } from "@/inngest";
import { newWorkspaceOperation } from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

export async function enableOrUpdateDataCleaningJob(jobId: string) {
  const supabase = newSupabaseServerClient();

  const { data: job, error } = await supabase
    .from("data_cleaning_jobs")
    .select()
    .is("deleted_at", null)
    .eq("id", jobId)
    .limit(1)
    .single();
  if (error) {
    throw error;
  }

  if (!job) {
    throw new Error("Missing job");
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // We mark any existing validated job as deleted
  const delRes = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .update({ deleted_at: dayjs().toISOString() })
    .is("deleted_at", null)
    .eq("data_cleaning_job_id", jobId);
  if (delRes.error) {
    throw delRes.error;
  }

  const insertRes = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .insert({
      data_cleaning_job_id: job.id,
      workspace_id: job.workspace_id,

      mode: job.mode,
      recurrence: job.recurrence,
      target_item_type: job.target_item_type,
      code: job.code,
    })
    .select()
    .single();
  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data;
}

export async function createSingleUseDataCleaningValidatedJob(jobId: string) {
  const supabase = newSupabaseServerClient();

  const { data: job, error } = await supabase
    .from("data_cleaning_jobs")
    .select()
    .is("deleted_at", null)
    .eq("id", jobId)
    .limit(1)
    .single();
  if (error) {
    throw error;
  }

  if (!job) {
    throw new Error("Missing job");
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const insertRes = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .insert({
      data_cleaning_job_id: job.id,
      workspace_id: job.workspace_id,

      mode: job.mode,
      recurrence: job.recurrence,
      target_item_type: job.target_item_type,
      code: job.code,

      deleted_at: dayjs().toISOString(), // We mark it as already deleted so that it wont trigger any execution
    })
    .select()
    .single();
  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data;
}

export async function disableDataCleaningJob(jobId: string) {
  const supabase = newSupabaseServerClient();

  const { data: job, error } = await supabase
    .from("data_cleaning_jobs")
    .select()
    .is("deleted_at", null)
    .eq("id", jobId)
    .single();
  if (error) {
    throw error;
  }

  if (!job) {
    throw new Error("Missing job");
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const delRes = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .update({ deleted_at: dayjs().toISOString() })
    .is("deleted_at", null)
    .eq("data_cleaning_job_id", jobId);
  if (delRes.error) {
    throw delRes.error;
  }
}

export async function execJobOnAllItems(jobId: string) {
  const supabase = newSupabaseServerClient();

  const { data: job, error } = await supabase
    .from("data_cleaning_jobs")
    .select()
    .is("deleted_at", null)
    .eq("id", jobId)
    .single();
  if (error) {
    throw error;
  }

  if (!job) {
    throw new Error("Missing job");
  }

  const supabaseAdmin = newSupabaseRootClient();

  let validatedJobForExecOnAll = await createSingleUseDataCleaningValidatedJob(
    jobId
  );

  const operation = await newWorkspaceOperation(
    supabaseAdmin,
    job.workspace_id,
    "JOB_EXEC_ON_ALL",
    "QUEUED",
    {}
  );

  await inngest.send({
    name: "job/exec-on-all-items.start",
    data: {
      workspaceId: job.workspace_id,
      operationId: operation.id,
      dataCleaningValidatedJobId: validatedJobForExecOnAll.id,
    },
  });
}
