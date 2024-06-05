"use server";

import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import { cookies } from "next/headers";

export async function enableOrUpdateDataCleaningJob(jobId: string) {
  const supabase = createServerActionClient<Database>({
    cookies: () => cookies(),
  });

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

export async function disableDataCleaningJob(jobId: string) {
  const supabase = createServerActionClient<Database>({
    cookies: () => cookies(),
  });

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
