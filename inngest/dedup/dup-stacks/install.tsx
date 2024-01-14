import { updateDupStacks } from "@/inngest/dedup/dup-stacks/update";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  return await updateDupStacks(supabase, workspaceId, async () => {
    await updateDupStackInstallationDone(supabase, workspaceId);
  });
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotalContacts, error: errorContacts } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId);
  if (errorContacts || dupTotalContacts === null) {
    throw errorContacts || new Error("missing count on contacts");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_total: dupTotalContacts,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  console.log("-> Items dup total: ", dupTotalContacts);
}

async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupContactsDone, error: errorContacts } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", true);
  if (errorContacts || dupContactsDone === null) {
    throw errorContacts || new Error("missing count");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupContactsDone,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    console.log(errorUpdate);
    return 0;
  }

  console.log("-> Dup stack items done:", dupContactsDone);
}
