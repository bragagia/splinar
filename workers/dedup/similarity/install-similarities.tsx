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
  table: "contacts" | "companies",
  batchIds: string[]
) {
  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error } = await supabase
      .from(table)
      .update({ similarity_checked: true, dup_checked: false })
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error) {
      throw error;
    }
  }
}

async function compareBatchWithAllInstalledBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  table: "contacts" | "companies",
  batchIds: string[],
  afterBatchCallback?: () => Promise<void>
) {
  let jobs: Job<SimilaritiesBatchEvalWorkerArgs, void, string>[] = [];

  let lastItemId: string | null = null;
  do {
    let query = supabase
      .from(table)
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
        table: table,
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
  table: "contacts" | "companies",
  afterBatchCallback?: () => Promise<void>
) {
  let jobs: Job<SimilaritiesBatchEvalWorkerArgs, void, string>[] = [];

  let batchLength = 0;
  do {
    let query = supabase
      .from(table)
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .order("id")
      .limit(BATCH_SIZE);

    // TODO: Sorting by uuid seems sketchy, i should use some combination of uuid and created at (or hs_id ?)

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
        table: table,
        batchAIds: batchIds,
      }
    );
    jobs.push(job);

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    const newJobs = await compareBatchWithAllInstalledBatches(
      supabase,
      workspaceId,
      table,
      batchIds,
      afterBatchCallback
    );
    jobs.push(...newJobs);

    await markBatchInstalled(supabase, table, batchIds);
  } while (batchLength === BATCH_SIZE);

  console.log("Waiting for job end");

  const queueEvent = newSimilaritiesBatchEvalQueueEvents();
  await Promise.all(jobs.map((job) => job.waitUntilFinished(queueEvent)));

  switch (table) {
    case "companies":
      console.log("Marking contact without similarities as checked");

      const { error: errorCompanies } = await supabase.rpc(
        "mark_companies_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorCompanies) {
        throw errorCompanies;
      }
      break;

    case "contacts":
      console.log("Marking contact without similarities as checked");

      const { error: errorContacts } = await supabase.rpc(
        "mark_contacts_without_similarities_as_dup_checked",
        { workspace_id_arg: workspaceId }
      );
      if (errorContacts) {
        throw errorContacts;
      }
      break;
  }
}

async function installContactsSimilarities(
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
      installation_contacts_similarities_total_batches: totalOperations,
      installation_contacts_similarities_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let batchStarted = 0;
  async function incrementBatchStarted() {
    batchStarted += 1;

    console.log("Contacts similarities batch started: ", batchStarted);
  }

  await updateSimilarities(
    supabase,
    workspaceId,
    "contacts",
    incrementBatchStarted
  );
}

async function installCompaniesSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: hsCompaniesCount, error: errorCompaniesCount } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorCompaniesCount || !hsCompaniesCount) {
    throw errorCompaniesCount || new Error("hsCompaniesCount: missing");
  }

  let batchTotal = Math.ceil(hsCompaniesCount / BATCH_SIZE);
  let totalOperations = (batchTotal + 1) * (batchTotal / 2);

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_companies_similarities_total_batches: totalOperations,
      installation_companies_similarities_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let batchStarted = 0;
  async function incrementBatchStarted() {
    batchStarted += 1;

    console.log("Companies similarities batch started: ", batchStarted);
  }

  await updateSimilarities(
    supabase,
    workspaceId,
    "companies",
    incrementBatchStarted
  );
}

export async function installSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  await installContactsSimilarities(supabase, workspaceId);
  await installCompaniesSimilarities(supabase, workspaceId);
}
