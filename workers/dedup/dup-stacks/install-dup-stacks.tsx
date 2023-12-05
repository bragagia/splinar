import { Database } from "@/types/supabase";
import { areContactsDups } from "@/workers/dedup/dup-stacks/are-contacts-dups";
import {
  createContactsDupstack,
  fetchNextContactReference,
  fetchSimilarContactsSortedByFillScore,
  resolveNextDuplicatesStack,
} from "@/workers/dedup/dup-stacks/resolve-duplicates-stack";
import { SupabaseClient } from "@supabase/supabase-js";

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);
  const startTime = performance.now();

  await updateDupStacks(
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

export async function updateDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 5
) {
  let counter = 0;

  do {
    const hasFoundContact = await resolveNextDuplicatesStack(
      supabase,
      workspaceId,
      areContactsDups,
      fetchNextContactReference,
      fetchSimilarContactsSortedByFillScore,
      createContactsDupstack
    );
    if (!hasFoundContact) {
      return counter;
    }

    counter++;
    if (callbackOnInterval && counter % intervalCallback === 0) {
      await callbackOnInterval();
    }
  } while (true);
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotal, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || dupTotal === null) {
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

async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  startTime: number,
  dupTotal: number
) {
  const { count: dupTodo, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || dupTodo === null) {
    console.log(error || new Error("missing count"));
    return;
  }

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
