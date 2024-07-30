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

export const dealsDefaultDedupConfig: DedupConfigT = {
  fields: [
    {
      id: "67198cd8-dc26-4117-a13e-c50bf234e66c",
      displayName: "Deal name",
      sources: ["dealname"],
      matchingMethod: "name",
      nameMinimumLength: 3,
      ifMatch: "potential",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "hubspot",
    },
    {
      id: "592440cb-22ce-4ff7-a14f-e38de395fb67",
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
      id: "f28f231b-cc62-40dd-bf26-703a968ca9c4",
      flagName: "Best filled",
      displayName: "Fields with values",
      source: "filled_score",
      dataType: "number",
      winner: "highest",
    },
  ],
};

export async function dealsPollUpdater(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  startFilter: Dayjs,
  endFilter: Dayjs,
  after?: string
): Promise<itemPollUpdaterT> {
  const itemTypeConfig = getItemTypeConfig(workspace, "DEALS");

  const hsClientSearch = await newHubspotClient(
    workspace.refresh_token,
    "search"
  );

  const propertiesRes = await hsClientSearch.crm.properties.coreApi.getAll(
    "deal"
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

  const res = await hsClientSearch.crm.deals.searchApi.doSearch(
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

  const { data: existingDbItems, error } = await supabase
    .from("items")
    .select()
    .eq("workspace_id", workspace.id)
    .eq("item_type", "DEALS")
    .in(
      "distant_id",
      res.results.map((contact) => contact.id)
    );
  if (error) {
    throw error;
  }

  const existingItemsByDistantId = existingDbItems.reduce((acc, contact) => {
    acc[contact.distant_id] = contact;
    return acc;
  }, {} as { [key: string]: Tables<"items"> });

  let dbItems = res.results.map((item) => {
    let itemCompanies: string[] | undefined =
      (existingItemsByDistantId[item.id]?.value as any)?.companies || undefined;

    let dbItem: TablesInsert<"items"> = {
      workspace_id: workspace.id,
      distant_id: item.id,
      item_type: "DEALS",
      value: {
        ...deleteNullKeys(item.properties),
        companies: itemCompanies,
      },
      similarity_checked: false,
      jobs_update_executed: false, // Note: We force update to false, but we let creation to existing value or default (= false)
      filled_score: 0, // Calculated below
    };

    const hasASimilarityFieldBeenUpdated = areSimilaritiesSourceFieldsDifferent(
      itemTypeConfig,
      existingItemsByDistantId[item.id],
      dbItem
    );

    if (!hasASimilarityFieldBeenUpdated && existingItemsByDistantId[item.id]) {
      // Note: We don't set it to "true" because in some cases in may be currently to false and we don't want to override it
      dbItem.similarity_checked =
        existingItemsByDistantId[item.id].similarity_checked;
    }

    dbItem.filled_score = listItemFields(
      workspace,
      dbItem as Tables<"items">
    ).length;

    (dbItem.value as any).filled_score = dbItem.filled_score.toString();

    return dbItem;
  });

  return {
    items: dbItems,
    after: res.paging?.next?.after || null,
    lastItemModifiedAt:
      (dbItems[dbItems.length - 1]?.value as any)?.lastmodifieddate || null,
  };
}

export async function updateBulkDeals(
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
    const res = await hsClient.crm.deals.basicApi.update(
      jobOutput[itemId].distantId,
      {
        properties: hubspotFieldUpdates,
      }
    );
  }
}

async function updateDealsItemTypeFields(
  supabase: SupabaseClient<Database>,
  hsClient: Client,
  workspace: WorkspaceT,
  op: "GET" | "UPDATE"
) {
  if (op === "GET" && workspace.item_types["DEALS"]?.hubspotSourceFields) {
    return workspace.item_types["DEALS"]?.hubspotSourceFields.map(
      (field) => field.value
    );
  } else {
    const propertiesRes = await hsClient.crm.properties.coreApi.getAll("deal");

    const updatedItemConfig = mergeItemConfig(workspace, "DEALS", {
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

export async function fetchDealsPage(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceT,
  after: string | undefined
) {
  const hsClient = await newHubspotClient(workspace.refresh_token);

  const propertiesList = await updateDealsItemTypeFields(
    supabase,
    hsClient,
    workspace,
    after ? "GET" : "UPDATE"
  );

  const propertiesListChunks = splitArrayIntoChunks(
    propertiesList,
    MAX_HUBSPOT_PROPERTIES_PER_REQUEST
  );

  let items: SimplePublicObjectWithAssociations[] = [];
  let nextAfter: string | undefined = undefined;

  for (const propertiesListChunk of propertiesListChunks) {
    const res = await hsClient.crm.deals.basicApi.getPage(
      100,
      after,
      propertiesListChunk,
      undefined,
      ["companies"]
    );

    nextAfter = res.paging?.next?.after;

    if (items.length === 0) {
      items = res.results;
    } else {
      // Merge the results properties
      res.results.forEach((item) => {
        let existingItem = items.find((c) => c.id === item.id);

        if (existingItem) {
          existingItem.properties = {
            ...existingItem.properties,
            ...item.properties,
          };
          // We don't merge associations as we only fetch companies
          // existingContact.associations = {
          //   ...existingContact.associations,
          //   ...contact.associations,
          // };
        } else {
          throw new Error(
            `Contact ${item.id} not found in existing contacts while merging chunks.`
          );
        }
      });
    }
  }

  if (!items || items.length === 0) {
    return {
      after: undefined,
      items: [],
    };
  }

  let dbItems = items.map((item) => {
    let itemCompanies: string[] | undefined =
      item.associations?.companies?.results.map((company) => company.id);

    if (itemCompanies && itemCompanies.length > 0) {
      // Deduplicate values
      itemCompanies = Array.from(new Set(itemCompanies));
    }

    let dbItem: TablesInsert<"items"> = {
      id: uuid(),
      workspace_id: workspace.id,
      distant_id: item.id,
      item_type: "DEALS",
      value: deepClean({
        ...deleteNullKeys(item.properties),
        companies: itemCompanies,
      }),
      similarity_checked: false,
      jobs_creation_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      jobs_update_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      filled_score: 0, // Calculated below
    };

    dbItem.filled_score = listItemFields(
      workspace,
      dbItem as Tables<"items">
    ).length;

    (dbItem.value as any).filled_score = dbItem.filled_score.toString();

    return dbItem;
  });

  return {
    after: nextAfter,
    items: dbItems,
  };
}
