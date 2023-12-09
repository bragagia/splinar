import { Database } from "@/types/supabase";
import {
  SIMILARITIES_BATCH_SIZE,
  updateSimilarities,
} from "@/workers/dedup/similarity/update";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function installSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  await installContactsSimilarities(supabase, workspaceId);
  await installCompaniesSimilarities(supabase, workspaceId);
}

async function installContactsSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: hsContactsCount, error: errorContactsCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorContactsCount || hsContactsCount === null) {
    throw errorContactsCount || new Error("hsContactCount: missing");
  }

  let batchTotal = Math.ceil(hsContactsCount / SIMILARITIES_BATCH_SIZE);
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
  if (errorCompaniesCount || hsCompaniesCount === null) {
    throw errorCompaniesCount || new Error("hsCompaniesCount: missing");
  }

  let batchTotal = Math.ceil(hsCompaniesCount / SIMILARITIES_BATCH_SIZE);
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
