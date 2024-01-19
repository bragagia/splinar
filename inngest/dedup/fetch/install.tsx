import { inngest } from "@/inngest";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
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

  let hsClientSearchLimited = await newHubspotClient(
    workspace.refresh_token,
    "search"
  );

  await updateInstallTotals(supabase, hsClientSearchLimited, workspaceId);

  await inngest.send({
    name: "workspace/companies/fetch.start",
    data: {
      workspaceId: workspaceId,
    },
  });
}

export async function getHubspotStats(hsClientSearchLimited: Client) {
  console.log("-> Fetch contacts stats");
  // Legacy documented here: https://legacydocs.hubspot.com/docs/methods/contacts/get-contacts-statistics
  const { total: contactsTotal } =
    await hsClientSearchLimited.crm.contacts.searchApi.doSearch({
      filterGroups: [],
      sorts: [],
      properties: [],
      limit: 100,
      after: 0,
    });

  console.log("contacts count: ", contactsTotal);

  console.log("-> Fetch companies stats");
  // Legacy documented here: https://legacydocs.hubspot.com/docs/methods/contacts/get-contacts-statistics
  const { total: companiesTotal } =
    await hsClientSearchLimited.crm.companies.searchApi.doSearch({
      filterGroups: [],
      sorts: [],
      properties: [],
      limit: 100,
      after: 0,
    });

  // TODO: error handling

  console.log("companies count: ", companiesTotal);

  return { companiesTotal, contactsTotal };
}

async function updateInstallTotals(
  supabase: SupabaseClient<Database>,
  hsClientSearchLimited: Client,
  workspaceId: string
) {
  const stats = await getHubspotStats(hsClientSearchLimited);

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_items_total: stats.companiesTotal + stats.contactsTotal,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }
}

export async function updateInstallItemsCount(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const items = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .limit(0);
  if (items.error) {
    throw items.error;
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_items_count: items.count || 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }
}
