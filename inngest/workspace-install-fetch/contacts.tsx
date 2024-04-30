import { inngest } from "@/inngest";
import { updateInstallItemsCount } from "@/inngest/workspace-install-fetch/install";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 3;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;

export async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string,
  after?: string
) {
  let pageId = 0;

  const propertiesRes = await hsClient.crm.properties.coreApi.getAll("contact");
  const propertiesList = propertiesRes.results.map((property) => property.name);

  do {
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
      let contactCompanies: string[] | undefined =
        contact.associations?.companies?.results
          ?.filter((company) => company.type == "contact_to_company_unlabeled")
          .map((company) => company.id);

      let dbContact: TablesInsert<"items"> = {
        id: uuid(),
        workspace_id: workspaceId,
        distant_id: contact.id,
        item_type: "CONTACTS",
        value: {
          ...deleteNullKeys(contact.properties),
          companies: contactCompanies,
        },
        similarity_checked: false,
        filled_score: 0, // Calculated below
      };

      dbContact.filled_score = listItemFields(
        dbContact as Tables<"items">
      ).length;

      (dbContact.value as any).filled_score = dbContact.filled_score.toString();

      return dbContact;
    });

    let { error: errorContact } = await supabase
      .from("items")
      .upsert(dbContacts, { onConflict: "workspace_id,item_type,distant_id" });
    if (errorContact) {
      throw errorContact;
    }

    pageId++;

    if (after) {
      if (pageId % UPDATE_COUNT_EVERY === 0) {
        await updateInstallItemsCount(supabase, workspaceId, operationId);
      }

      if (pageId % WORKER_LIMIT === 0) {
        await inngest.send({
          name: "workspace/install/fetch/contacts.start",
          data: {
            workspaceId: workspaceId,
            operationId: operationId,
            after: after,
          },
        });

        return;
      }
    }
  } while (after);

  // Final update
  await updateInstallItemsCount(supabase, workspaceId, operationId);

  // End of general fetching
  await inngest.send({
    name: "workspace/install/similarities.start",
    data: {
      workspaceId: workspaceId,
      operationId: operationId,
    },
  });
}

export function deleteNullKeys(values: { [key: string]: string | null }) {
  let newValues: { [key: string]: string } = {};

  Object.keys(values).forEach((key) => {
    const val = values[key];
    if (val !== null) {
      newValues[key] = val;
    }
  });

  return newValues;
}
