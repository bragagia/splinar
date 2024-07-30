import { inngest } from "@/inngest";
import { newHubspotClient } from "@/lib/hubspot";
import { getItemTypesList } from "@/lib/items_common";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";
import dayjs from "dayjs";

export async function fullFetch(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string
) {
  console.info("-> Fetching hubspot data");

  let { data: workspace, error: workspaceError } = await supabaseAdmin
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

  // Update last poll before fetching to ensure we don't miss any updated data when polling
  await supabaseAdmin
    .from("workspaces")
    .update({
      last_poll: dayjs().toISOString(),
    })
    .eq("id", workspaceId);

  const stats = await getHubspotStats(hsClientSearchLimited);

  await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
    supabaseAdmin,
    operationId,
    {
      steps: {
        fetch: {
          startedAt: dayjs().toISOString(),
          itemsTotal:
            stats.companiesTotal + stats.contactsTotal + stats.dealsTotal,
          itemsDone: 0,
        },
      },
    }
  );

  await inngest.send({
    name: "workspace/install/fetch.start",
    data: {
      workspaceId: workspaceId,
      operationId: operationId,
      itemTypes: getItemTypesList(),
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
      after: "0",
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
      after: "0",
    });

  // TODO: error handling

  console.log("companies count: ", companiesTotal);

  console.log("-> Fetch deals stats");
  // Legacy documented here: https://legacydocs.hubspot.com/docs/methods/contacts/get-contacts-statistics
  const { total: dealsTotal } =
    await hsClientSearchLimited.crm.deals.searchApi.doSearch({
      filterGroups: [],
      sorts: [],
      properties: [],
      limit: 100,
      after: "0",
    });

  console.log("deals count: ", dealsTotal);

  return { companiesTotal, contactsTotal, dealsTotal };
}

export async function updateInstallItemsCount(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string
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

  const operation =
    await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
      supabase,
      operationId,
      {
        steps: {
          fetch: {
            itemsDone: items.count || 0,
          },
        },
      }
    );

  if (operation.ope_type === "WORKSPACE_INSTALL") {
    const { error } = await supabase
      .from("workspaces")
      .update({
        items_count_on_install: items.count || 0,
      })
      .eq("id", workspaceId);
    if (error) {
      throw error;
    }
  }
}
