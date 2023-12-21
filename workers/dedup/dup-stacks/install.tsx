import { Database } from "@/types/supabase";
import {
  updateCompaniesDupStacks,
  updateContactsDupStacks,
} from "@/workers/dedup/dup-stacks/update";
import { SupabaseClient } from "@supabase/supabase-js";

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  await installContactsDupStacks(supabase, workspaceId);
  await installCompaniesDupStacks(supabase, workspaceId);
}

export async function installContactsDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);
  const startTime = performance.now();

  return await updateContactsDupStacks(supabase, workspaceId, async () => {
    await updateDupStackInstallationDone(
      supabase,
      workspaceId,
      startTime,
      dupTotal
    );
  });
}

export async function installCompaniesDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);
  const startTime = performance.now();

  return await updateCompaniesDupStacks(supabase, workspaceId, async () => {
    await updateDupStackInstallationDone(
      supabase,
      workspaceId,
      startTime,
      dupTotal
    );
  });
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotalContacts, error: errorContacts } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorContacts || dupTotalContacts === null) {
    throw errorContacts || new Error("missing count on contacts");
  }

  const { count: dupTotalCompanies, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorCompanies || dupTotalCompanies === null) {
    throw errorCompanies || new Error("missing count on companies");
  }

  const dupTotal = dupTotalContacts + dupTotalCompanies;

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_total: dupTotal,
      installation_dup_done: 0,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  return dupTotal;
}

async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  startTime: number,
  dupTotal: number
) {
  const { count: dupContactsDone, error: errorContacts } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", true);
  if (errorContacts || dupContactsDone === null) {
    console.log(errorContacts || new Error("missing count"));
    return;
  }

  const { count: dupCompaniesDone, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", true);
  if (errorCompanies || dupCompaniesDone === null) {
    console.log(errorCompanies || new Error("missing count"));
    return;
  }

  const dupDone = dupContactsDone + dupCompaniesDone;

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupDone,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    console.log(errorUpdate);
    return 0;
  }

  console.log(
    "Dup stack batch",
    dupDone,
    "/",
    dupTotal,
    "- time:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return dupDone;
}
