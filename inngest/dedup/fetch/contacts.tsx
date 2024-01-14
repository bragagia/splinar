import { inngest } from "@/inngest";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { ItemLink } from "@/types/items";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 3;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;

export async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  after?: string
) {
  let pageId = 0;

  const propertiesRes = await hsClient.crm.properties.coreApi.getAll("contact");
  const propertiesList = propertiesRes.results.map((property) => property.name);

  do {
    pageId++;

    if (pageId % UPDATE_COUNT_EVERY === 0) {
      await updateInstallItemsCount(supabase, workspaceId);
    }

    if (pageId % WORKER_LIMIT === 0) {
      await inngest.send({
        name: "workspace/contacts/fetch.start",
        data: {
          workspaceId: workspaceId,
          after: after,
        },
      });

      return;
    }

    console.log("Fetching contact page ", after);

    const res = await hsClient.crm.contacts.basicApi.getPage(
      100,
      after,
      propertiesList,
      undefined,
      ["companies"]
    );

    after = res.paging?.next?.after;

    const contacts = res.results;

    if (!contacts || contacts.length === 0) {
      break;
    }

    let dbContacts = contacts.map((contact) => {
      let contactCompanies: ItemLink[] | undefined =
        contact.associations?.companies?.results
          ?.filter((company) => company.type == "contact_to_company_unlabeled")
          .map((company) => ({
            id: company.id,
          }));

      let dbContact: TablesInsert<"items"> = {
        id: uuid(),
        workspace_id: workspaceId,
        distant_id: contact.id,
        item_type: "CONTACTS",
        value: { ...contact.properties, companies: contactCompanies },
        similarity_checked: false,
        dup_checked: false,
        filled_score: 0, // Calculated below
      };

      dbContact.filled_score = listItemFields(
        dbContact as Tables<"items">
      ).length;

      return dbContact;
    });

    let { error: errorContact } = await supabase
      .from("items")
      .insert(dbContacts);
    if (errorContact) {
      throw errorContact;
    }
  } while (after);

  // Final update
  await updateInstallItemsCount(supabase, workspaceId);

  // End of general fetching
  await supabase
    .from("workspaces")
    .update({ installation_fetched: true })
    .eq("id", workspaceId);

  await inngest.send({
    name: "workspace/all/fetch.finished",
    data: {
      workspaceId: workspaceId,
    },
  });
}

export async function updateInstallItemsCount(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const items = await supabase
    .from("items")
    .select(undefined, { count: "exact" })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId);
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
