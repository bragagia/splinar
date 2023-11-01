import { resolveNextDuplicatesStack } from "@/defer/dup-stacks/resolve-duplicates-stack-new";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function updateDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  limit?: number
) {
  let counter = 0;

  do {
    const hasFoundContact = await resolveNextDuplicatesStack(
      supabase,
      workspaceId
    );
    if (!hasFoundContact) {
      return counter;
    }

    counter++;
    if (limit && counter >= limit) {
      return counter;
    }
  } while (true);
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotal, error } = await supabase
    .from("hs_contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || !dupTotal) {
    throw error || new Error("missing count");
  }

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

export async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupTotal: number
) {
  const { count: dupTodo, error } = await supabase
    .from("hs_contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || !dupTodo) {
    throw error || new Error("missing count");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupTotal - dupTodo,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  return dupTotal - dupTodo;
}

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const BATCH_SIZE = 5;

  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);

  while (
    (await updateDupStacks(supabase, workspaceId, BATCH_SIZE)) === BATCH_SIZE
  ) {
    await updateDupStackInstallationDone(supabase, workspaceId, dupTotal);
  }
}
