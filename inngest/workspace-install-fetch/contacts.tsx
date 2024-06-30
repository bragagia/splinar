import { inngest } from "@/inngest";
import { updateInstallItemsCount } from "@/inngest/workspace-install-fetch/install";
import { splitArrayIntoChunks } from "@/lib/arrays";
import { deleteNullKeys } from "@/lib/companies";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SimplePublicObjectWithAssociations } from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 6;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;
const MAX_PROPERTIES_PER_REQUEST = 500; // Has been tested to work up to 615

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
  const propertiesListChunks = splitArrayIntoChunks(
    propertiesList,
    MAX_PROPERTIES_PER_REQUEST
  );

  do {
    console.log("Fetching contact page ", after);

    let contacts: SimplePublicObjectWithAssociations[] = [];
    let nextAfter: string | undefined = undefined;

    for (const propertiesListChunk of propertiesListChunks) {
      const res = await hsClient.crm.contacts.basicApi.getPage(
        100,
        after,
        propertiesListChunk,
        undefined,
        ["companies"]
      );

      nextAfter = res.paging?.next?.after;

      if (contacts.length === 0) {
        contacts = res.results;
      } else {
        // Merge the results properties
        res.results.forEach((contact) => {
          let existingContact = contacts.find((c) => c.id === contact.id);

          if (existingContact) {
            existingContact.properties = {
              ...existingContact.properties,
              ...contact.properties,
            };
            // We don't merge associations as we only fetch companies
            // existingContact.associations = {
            //   ...existingContact.associations,
            //   ...contact.associations,
            // };
          } else {
            throw new Error(
              `Contact ${contact.id} not found in existing contacts while merging chunks.`
            );
          }
        });
      }
    }

    after = nextAfter;

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
        jobs_creation_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
        jobs_update_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
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
