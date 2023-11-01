import { fetchCompanies } from "@/defer/fetch/fetch-companies";
import { fetchContacts } from "@/defer/fetch/fetch-contacts";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function fullFetch(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  let { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (workspaceError) {
    throw workspaceError;
  }
  if (!workspace) {
    throw new Error("Missing workspace");
  }

  let hsClient = await newHubspotClient(workspace.refresh_token);

  let allCompanies = await fetchCompanies(hsClient, supabase, workspaceId);

  await fetchContacts(hsClient, supabase, workspaceId, allCompanies);

  await supabase
    .from("workspaces")
    .update({ installation_fetched: true })
    .eq("id", workspaceId);
}
