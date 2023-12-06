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
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);
  const startTime = performance.now();

  await updateContactsDupStacks(
    supabase,
    workspaceId,
    async () => {
      await updateDupStackInstallationDone(
        supabase,
        workspaceId,
        startTime,
        dupTotal
      );
    },
    30
  );

  await updateCompaniesDupStacks(
    supabase,
    workspaceId,
    async () => {
      await updateDupStackInstallationDone(
        supabase,
        workspaceId,
        startTime,
        dupTotal
      );
    },
    30
  );
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotalContacts, error: errorContacts } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (errorContacts || dupTotalContacts === null) {
    throw errorContacts || new Error("missing count on contacts");
  }

  const { count: dupTotalCompanies, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
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
  const { count: dupContactsTodo, error: errorContacts } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (errorContacts || dupContactsTodo === null) {
    console.log(errorContacts || new Error("missing count"));
    return;
  }

  const { count: dupCompaniesTodo, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (errorCompanies || dupCompaniesTodo === null) {
    console.log(errorCompanies || new Error("missing count"));
    return;
  }

  const dupTodo = dupContactsTodo + dupCompaniesTodo;

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupTotal - dupTodo,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    console.log(errorUpdate);
    return 0;
  }

  console.log(
    "Dup stack batch",
    dupTotal - dupTodo,
    "/",
    dupTotal,
    "- time:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return dupTotal - dupTodo;
}
