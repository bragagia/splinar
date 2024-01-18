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
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false);
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
  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (errorWorkspace || workspace === null) {
    throw errorWorkspace || new Error("missing workspace");
  }

  const { count: dupContactsRemaining, error: errorContacts } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false);
  if (errorContacts || dupContactsRemaining === null) {
    throw errorContacts || new Error("missing count");
  }

  const dupContactsDone =
    workspace.installation_dup_total - dupContactsRemaining;

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

  console.log(
    "-> Dup stack items done:",
    dupContactsDone,
    "/",
    workspace.installation_dup_total
  );
}
