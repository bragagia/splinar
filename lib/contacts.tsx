import { splitArrayIntoChunks } from "@/lib/arrays";
import { deleteNullKeys } from "@/lib/companies";
import { deepClean } from "@/lib/deep_clean";
import {
  convertOutputPropertyToHubspotProperty,
  MAX_HUBSPOT_PROPERTIES_PER_REQUEST,
  newHubspotClient,
} from "@/lib/hubspot";
import {
  areSimilaritiesSourceFieldsDifferent,
  DedupConfigT,
  getItemTypeConfig,
  ItemFieldSourceT,
  itemPollUpdaterT,
  JobOutputByItemId,
  listItemFields,
  mergeItemConfig,
} from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { WorkspaceT } from "@/lib/workspace";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
  SimplePublicObjectWithAssociations,
} from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs, { Dayjs } from "dayjs";

import { Client } from "@hubspot/api-client";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
dayjs.extend(relativeTime);
dayjs.extend(utc);

export const contactsDefaultHubspotSourceFields: ItemFieldSourceT[] = [
  {
    value: "firstname",
    label: "First name",
  },
  {
    value: "lastname",
    label: "Last name",
  },
  {
    value: "email",
    label: "Email",
  },
  {
    value: "phone",
    label: "Phone",
  },
  {
    value: "mobilephone",
    label: "Mobile phone",
  },
  {
    value: "hs_linkedinid",
    label: "Linkedin",
  },
  {
    value: "companies",
    label: "Companies",
  },
];

export const contactsDefaultDedupConfig: DedupConfigT = {
  fields: [
    {
      id: "b8ab3013-ddc5-4dec-8f0f-6c42e22064ce",
      displayName: "Full name",
      sources: ["firstname", "lastname"],
      matchingMethod: "name",
      nameMinimumLength: 3,
      ifMatch: "potential",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "hubspot",
    },
    {
      id: "e83701e1-c834-4093-b87a-2c928ce1ab1a",
      displayName: "Emails",
      sources: ["email"],
      matchingMethod: "email",
      ifMatch: "confident",
      ifDifferent: "reduce-potential",
    },
    {
      id: "f4301d99-295c-4491-91e2-21335110f675",
      displayName: "linkedin",
      sources: ["hs_linkedinid"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-potential",
      linkType: "linkedin",
    },
    {
      id: "7e290d76-aa92-4c4b-ae22-8236fc73070d",
      displayName: "Phones",
      sources: ["phone", "mobilephone"],
      matchingMethod: "exact",
      ifMatch: "multiplier",
      ifDifferent: "reduce-potential",
    },
    {
      id: "3982daff-7b19-4b65-914b-d2f02b54f7d9",
      displayName: "Companies",
      sources: ["companies"],
      matchingMethod: "exact",
      ifMatch: "multiplier",
      ifDifferent: "null",
      linkType: "item-reference",
    },
  ],
  flags: [
    {
      id: "c45c9aa0-261f-47d4-b8f8-342ed85a1585",
      flagName: "Best filled",
      displayName: "Fields with values",
      source: "filled_score",
      dataType: "number",
      winner: "highest",
    },
    {
      id: "48c8cd9a-d31d-4469-8577-872430b4fca9",
      flagName: "Last engaged",
      displayName: "Last engagement date",
      source: "hs_last_sales_activity_timestamp",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "48b0531b-9e74-4e5b-9dbf-326097459a30",
      flagName: "Last contacted",
      displayName: "Last contact date",
      source: "notes_last_contacted",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "127f91d3-e88d-418e-8fb4-7362320bec46",
      flagName: "Last activity",
      displayName: "Last activity date",
      source: "notes_last_updated",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "4be48025-a482-450c-9700-603d138a5584",
      flagName: "Most contacted",
      displayName: "Number of times contacted",
      source: "num_contacted_notes",
      dataType: "number",
      winner: "highest",
    },
  ],
};

export async function contactsPollUpdater(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  startFilter: Dayjs,
  endFilter: Dayjs,
  after?: string
): Promise<itemPollUpdaterT> {
  const itemTypeConfig = getItemTypeConfig(workspace, "CONTACTS");

  const hsClientSearch = await newHubspotClient(
    workspace.refresh_token,
    "search"
  );

  const propertiesRes = await hsClientSearch.crm.properties.coreApi.getAll(
    "contact"
  );
  const propertiesList = propertiesRes.results.map((property) => property.name);

  const objectSearchRequest: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "lastmodifieddate",
            operator: FilterOperatorEnum.Gte,
            value: startFilter.utc().toISOString(),
          },
          {
            propertyName: "lastmodifieddate",
            operator: FilterOperatorEnum.Lte,
            value: endFilter.utc().toISOString(),
          },
        ],
      },
    ],
    sorts: ["lastmodifieddate"],
    properties: propertiesList,
    limit: 100,
    after: (after as any) || 0,
  };

  const res = await hsClientSearch.crm.contacts.searchApi.doSearch(
    objectSearchRequest
  );

  // Get existing contacts to add companies associations because they are missing from search results

  if (res.results.length === 0) {
    return {
      items: [],
      after: null,
      lastItemModifiedAt: null,
    };
  }

  const { data: existingDbContacts, error } = await supabase
    .from("items")
    .select()
    .eq("workspace_id", workspace.id)
    .eq("item_type", "CONTACTS")
    .in(
      "distant_id",
      res.results.map((contact) => contact.id)
    );
  if (error) {
    throw error;
  }

  const existingContactsByDistantId = existingDbContacts.reduce(
    (acc, contact) => {
      acc[contact.distant_id] = contact;
      return acc;
    },
    {} as { [key: string]: Tables<"items"> }
  );

  let dbContacts = res.results.map((contact) => {
    let contactCompanies: string[] | undefined =
      (existingContactsByDistantId[contact.id]?.value as any)?.companies ||
      undefined;

    let dbContact: TablesInsert<"items"> = {
      workspace_id: workspace.id,
      distant_id: contact.id,
      item_type: "CONTACTS",
      value: {
        ...deleteNullKeys(contact.properties),
        companies: contactCompanies,
      },
      similarity_checked: false,
      jobs_update_executed: false, // Note: We force update to false, but we let creation to existing value or default (= false)
      filled_score: 0, // Calculated below
    };

    const hasASimilarityFieldBeenUpdated = areSimilaritiesSourceFieldsDifferent(
      itemTypeConfig,
      existingContactsByDistantId[contact.id],
      dbContact
    );

    if (
      !hasASimilarityFieldBeenUpdated &&
      existingContactsByDistantId[contact.id]
    ) {
      // Note: We don't set it to "true" because in some cases in may be currently to false and we don't want to override it
      dbContact.similarity_checked =
        existingContactsByDistantId[contact.id].similarity_checked;
    }

    dbContact.filled_score = listItemFields(
      workspace,
      dbContact as Tables<"items">
    ).length;

    (dbContact.value as any).filled_score = dbContact.filled_score.toString();

    return dbContact;
  });

  return {
    items: dbContacts,
    after: res.paging?.next?.after || null,
    lastItemModifiedAt:
      (dbContacts[dbContacts.length - 1]?.value as any)?.lastmodifieddate ||
      null,
  };
}

export async function updateBulkContacts(
  workspace: Tables<"workspaces">,
  jobOutput: JobOutputByItemId
) {
  const hsClient = await newHubspotClient(workspace.refresh_token);

  for (const itemId of Object.keys(jobOutput)) {
    const hubspotFieldUpdates = Object.keys(jobOutput[itemId].Next).reduce(
      (acc, fieldName) => {
        acc[fieldName] = convertOutputPropertyToHubspotProperty(
          jobOutput[itemId].Next[fieldName]
        );
        return acc;
      },
      {} as { [key: string]: string }
    );

    console.log("[Hubspot] Updating item", itemId, "with", hubspotFieldUpdates);

    // Note: In case of error, we actually don't want to catch it here
    const res = await hsClient.crm.contacts.basicApi.update(
      jobOutput[itemId].distantId,
      {
        properties: hubspotFieldUpdates,
      }
    );
  }
}

async function updateContactsItemTypeFields(
  supabase: SupabaseClient<Database>,
  hsClient: Client,
  workspace: WorkspaceT,
  op: "GET" | "UPDATE"
) {
  if (op === "GET" && workspace.item_types["CONTACTS"]?.hubspotSourceFields) {
    return workspace.item_types["CONTACTS"]?.hubspotSourceFields.map(
      (field) => field.value
    );
  } else {
    const propertiesRes = await hsClient.crm.properties.coreApi.getAll(
      "contact"
    );

    const updatedItemConfig = mergeItemConfig(workspace, "CONTACTS", {
      hubspotSourceFields: propertiesRes.results
        .map((property) => {
          return {
            value: property.name,
            label: property.label,
          };
        })
        .concat([
          {
            value: "companies",
            label: "Companies",
          },
        ]),
    });

    const { error: errorWorkspaceUpdate } = await supabase
      .from("workspaces")
      .update({
        item_types: updatedItemConfig,
      })
      .eq("id", workspace.id);
    if (errorWorkspaceUpdate) {
      throw errorWorkspaceUpdate;
    }

    const propertiesList = propertiesRes.results.map(
      (property) => property.name
    );

    return propertiesList;
  }
}

export async function fetchContactsPage(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceT,
  after: string | undefined
) {
  const hsClient = await newHubspotClient(workspace.refresh_token);

  const propertiesList = await updateContactsItemTypeFields(
    supabase,
    hsClient,
    workspace,
    after ? "GET" : "UPDATE"
  );

  const propertiesListChunks = splitArrayIntoChunks(
    propertiesList,
    MAX_HUBSPOT_PROPERTIES_PER_REQUEST
  );

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

  if (!contacts || contacts.length === 0) {
    return {
      after: undefined,
      items: [],
    };
  }

  let dbContacts = contacts.map((contact) => {
    let itemCompanies: string[] | undefined =
      contact.associations?.companies?.results.map((company) => company.id);

    if (itemCompanies && itemCompanies.length > 0) {
      // Deduplicate values
      itemCompanies = Array.from(new Set(itemCompanies));
    }

    let dbContact: TablesInsert<"items"> = {
      id: uuid(),
      workspace_id: workspace.id,
      distant_id: contact.id,
      item_type: "CONTACTS",
      value: deepClean({
        ...deleteNullKeys(contact.properties),
        companies: itemCompanies,
      }),
      similarity_checked: false,
      jobs_creation_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      jobs_update_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      filled_score: 0, // Calculated below
    };

    dbContact.filled_score = listItemFields(
      workspace,
      dbContact as Tables<"items">
    ).length;

    (dbContact.value as any).filled_score = dbContact.filled_score.toString();

    return dbContact;
  });

  return {
    after: nextAfter,
    items: dbContacts,
  };
}
