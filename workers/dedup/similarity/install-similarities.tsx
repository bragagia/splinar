import {
  newSimilaritiesBatchEvalQueueEvents,
  similaritiesBatchEvalQueueAdd,
} from "@/lib/queues/similarities-batch-eval";
import { SUPABASE_FILTER_MAX_SIZE } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { SimilaritiesBatchEvalWorkerArgs } from "@/workers/similarities-batch-eval";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";
import { Job } from "bullmq";

const BATCH_SIZE = 1000;

async function markBatchInstalled(
  supabase: SupabaseClient<Database>,
  batchIds: string[]
) {
  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error } = await supabase
      .from("contacts")
      .update({ similarity_checked: true, dup_checked: false })
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error) {
      throw error;
    }
  }
}

async function compareBatchWithAllInstalledContacts(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchIds: string[],
  afterBatchCallback?: () => Promise<void>
) {
  let jobs: Job<SimilaritiesBatchEvalWorkerArgs, void, string>[] = [];

  let lastItemId: string | null = null;
  do {
    let query = supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("id")
      .limit(BATCH_SIZE);

    if (lastItemId) {
      query = query.gt("id", lastItemId);
    }

    const { data: installedBatch, error: errorInstalledBatch } = await query;
    if (errorInstalledBatch) {
      console.log("errorInstalledBatch", errorInstalledBatch);
      break;
    }
    if (!installedBatch || installedBatch.length === 0) {
      break;
    }

    const installedBatchIds = installedBatch.map((o) => o.id);

    const job = await similaritiesBatchEvalQueueAdd(
      workspaceId + "-" + batchIds[0] + "-" + installedBatchIds[0],
      {
        workspaceId: workspaceId,
        batchAIds: batchIds,
        batchBIds: installedBatchIds,
      }
    );
    jobs.push(job);

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    lastItemId = installedBatch[installedBatch.length - 1].id;
    if (installedBatch.length !== BATCH_SIZE) {
      lastItemId = null;
    }
  } while (lastItemId);

  return jobs;
}

async function updateSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  afterBatchCallback?: () => Promise<void>
) {
  let jobs: Job<SimilaritiesBatchEvalWorkerArgs, void, string>[] = [];

  let batchLength = 0;
  do {
    let query = supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .limit(BATCH_SIZE);

    const { data: batch, error: error } = await query;
    if (error) {
      throw error;
    }
    if (!batch || batch.length === 0) {
      break;
    }
    batchLength = batch.length;

    const batchIds = batch.map((o) => o.id);

    const job = await similaritiesBatchEvalQueueAdd(
      workspaceId + "-" + batchIds[0] + "-single",
      {
        workspaceId: workspaceId,
        batchAIds: batchIds,
      }
    );
    jobs.push(job);

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    const newJobs = await compareBatchWithAllInstalledContacts(
      supabase,
      workspaceId,
      batchIds,
      afterBatchCallback
    );
    jobs.push(...newJobs);

    await markBatchInstalled(supabase, batchIds);
  } while (batchLength === BATCH_SIZE);

  console.log("Waiting for job end");

  const queueEvent = newSimilaritiesBatchEvalQueueEvents();
  await Promise.all(jobs.map((job) => job.waitUntilFinished(queueEvent)));

  console.log("Marking contact without similarities as checked");

  const { error } = await supabase.rpc(
    "mark_contacts_without_similarities_as_dup_checked",
    { workspace_id_arg: workspaceId }
  );
  if (error) {
    throw error;
  }
}

export async function installSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: hsContactsCount, error: errorContactsCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorContactsCount || !hsContactsCount) {
    throw errorContactsCount || new Error("hsContactCount: missing");
  }

  let batchTotal = Math.ceil(hsContactsCount / BATCH_SIZE);
  let totalOperations = (batchTotal + 1) * (batchTotal / 2);

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_similarity_total_batches: totalOperations,
      installation_similarity_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let batchStarted = 0;
  async function incrementBatchStarted() {
    batchStarted += 1;

    console.log("Similarities batch started: ", batchStarted);
  }

  await updateSimilarities(supabase, workspaceId, incrementBatchStarted);
}
