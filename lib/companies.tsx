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
import { Database, Tables, TablesInsert } from "@/types/supabase";
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
  SimplePublicObjectWithAssociations,
} from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs, { Dayjs } from "dayjs";

import { splitArrayIntoChunks } from "@/lib/arrays";
import { WorkspaceT } from "@/lib/workspace";
import { Client } from "@hubspot/api-client";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

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

export const companiesDefaultHubspotSourceFields: ItemFieldSourceT[] = [
  {
    value: "name",
    label: "Name",
  },
  {
    value: "domain",
    label: "Domain",
  },
  {
    value: "website",
    label: "Website",
  },
  {
    value: "linkedin_company_page",
    label: "LinkedIn",
  },
  {
    value: "phone",
    label: "Phone",
  },
  {
    value: "address",
    label: "Address",
  },
  {
    value: "zip",
    label: "Zip",
  },
  {
    value: "city",
    label: "City",
  },
  {
    value: "state",
    label: "State",
  },
  {
    value: "country",
    label: "Country",
  },
  {
    value: "facebook_company_page",
    label: "Facebook",
  },
  {
    value: "twitterhandle",
    label: "Twitter",
  },
];

export const companiesDefaultDedupConfig: DedupConfigT = {
  fields: [
    {
      id: "81aa1ed0-ce0d-4b4e-8f49-99a5c4fdf26f",
      displayName: "Name",
      sources: ["name"],
      matchingMethod: "name",
      ifMatch: "potential",
      ifDifferent: "prevent-confident-reduce-potential",
      linkType: "hubspot",
    },
    {
      id: "aecc092d-cdcf-477e-96ee-8fd8371982ff",
      displayName: "Website",
      sources: ["domain", "website"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident",
      linkType: "external",
    },
    {
      id: "a01d710d-6c50-43b2-ae37-a306ff22c4ea",
      displayName: "LinkedIn",
      sources: ["linkedin_company_page"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "linkedin",
    },
    {
      id: "c729d617-d4a6-435b-a94d-6f1dbc3e6274",
      displayName: "Phones",
      sources: ["phone"],
      matchingMethod: "exact",
      ifMatch: "confident",
      ifDifferent: "reduce-confident",
    },
    // {
    //   id: "6896b00a-1e71-4919-96ee-dfdc2d32a2f9",
    //   displayName: "Address",
    //   sources: ["address", "zip", "city", "state", "country"],
    //   nameMinimumLength: 25,
    //   matchingMethod: "name",
    //   ifMatch: "potential",
    //   ifDifferent: "null",
    // },
    {
      id: "3335c6b4-8719-40a5-8021-8fc0bc5dc70e",
      displayName: "Facebook",
      sources: ["facebook_company_page"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "facebook",
    },
    {
      id: "70655159-9477-422b-8add-9983ec5a6a61",
      displayName: "Twitter",
      sources: ["twitterhandle"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "twitter",
    },
  ],
  flags: [
    {
      id: "7d8c56ae-9a93-4844-8004-f96fc080137f",
      flagName: "Best filled",
      displayName: "Fields with values",
      source: "filled_score",
      dataType: "number",
      winner: "highest",
    },
    {
      id: "ab06ccab-9fcb-4b3c-9504-96849ee6a35b",
      flagName: "Last booked",
      displayName: "Last Booked Meeting Date",
      source: "hs_last_booked_meeting_date",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "78b8f3c9-b958-47a1-bb19-5d95e1f718de",
      flagName: "Last logged call",
      displayName: "Last Logged Call Date",
      source: "hs_last_logged_call_date",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "80273c17-1f0f-4c57-89f8-e9a3e25ea949",
      flagName: "Last opened task",
      displayName: "Last Open Task Date",
      source: "hs_last_open_task_date",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "50e69b8b-c748-4c71-a7fd-71baf8b075e7",
      flagName: "Last engaged",
      displayName: "Last Engagement Date",
      source: "hs_last_sales_activity_timestamp",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "575cb9b9-ef8e-412f-8220-e3606d8ddd81",
      flagName: "Last contacted",
      displayName: "Last Contacted",
      source: "notes_last_contacted",
      dataType: "date",
      winner: "highest",
    },
    {
      id: "84e59329-9710-46e0-b70c-e86e822a99cf",
      flagName: "Last activity",
      displayName: "Last Activity Date",
      source: "notes_last_updated",
      dataType: "date",
      winner: "highest",
    },
  ],
};

export async function companiesPollUpdater(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  startFilter: Dayjs,
  endFilter: Dayjs,
  after?: string
): Promise<itemPollUpdaterT> {
  const itemTypeConfig = getItemTypeConfig(workspace, "COMPANIES");

  const hsClient = await newHubspotClient(workspace.refresh_token, "search");

  const propertiesRes = await hsClient.crm.properties.coreApi.getAll("company");
  const propertiesList = propertiesRes.results.map((property) => property.name);

  const objectSearchRequest: PublicObjectSearchRequest = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "hs_lastmodifieddate",
            operator: FilterOperatorEnum.Gte,
            value: startFilter.utc().toISOString(), // We subtract 30 seconds because hubspot doesn't refresh the lastmodifieddate instantly and we don't want to miss any data
          },
          {
            propertyName: "hs_lastmodifieddate",
            operator: FilterOperatorEnum.Lte,
            value: endFilter.utc().toISOString(),
          },
        ],
      },
    ],
    sorts: ["hs_lastmodifieddate"],
    properties: propertiesList,
    limit: 100,
    after: (after as any) || 0,
  };

  const res = await hsClient.crm.companies.searchApi.doSearch(
    objectSearchRequest
  );

  const { data: existingDbCompanies, error } = await supabase
    .from("items")
    .select()
    .eq("workspace_id", workspace.id)
    .eq("item_type", "COMPANIES")
    .in(
      "distant_id",
      res.results.map((company) => company.id)
    );
  if (error) {
    throw error;
  }

  const existingCompaniesByDistantId = existingDbCompanies.reduce(
    (acc, company) => {
      acc[company.distant_id] = company;
      return acc;
    },
    {} as { [key: string]: Tables<"items"> }
  );

  let dbCompanies = res.results.map((company) => {
    let dbCompany: TablesInsert<"items"> = {
      workspace_id: workspace.id,
      distant_id: company.id,
      item_type: "COMPANIES",
      value: deleteNullKeys(company.properties),
      similarity_checked: false,
      jobs_update_executed: false, // Note: We force update to false, but we let creation to existing value or default (= false)
      filled_score: 0,
    };

    const hasASimilarityFieldBeenUpdated = areSimilaritiesSourceFieldsDifferent(
      itemTypeConfig,
      existingCompaniesByDistantId[company.id],
      dbCompany
    );

    if (
      !hasASimilarityFieldBeenUpdated &&
      existingCompaniesByDistantId[company.id]
    ) {
      // Note: We don't set it to "true" because in some cases in may be currently to false and we don't want to override it
      dbCompany.similarity_checked =
        existingCompaniesByDistantId[company.id].similarity_checked;
    }

    dbCompany.filled_score = listItemFields(
      workspace,
      dbCompany as Tables<"items">
    ).length;

    (dbCompany.value as any).filled_score = dbCompany.filled_score.toString();

    return dbCompany;
  });

  return {
    items: dbCompanies,
    after: res.paging?.next?.after || null,
    lastItemModifiedAt:
      (dbCompanies[dbCompanies.length - 1]?.value as any)
        ?.hs_lastmodifieddate || null,
  };
}

export async function updateBulkCompanies(
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
    const res = await hsClient.crm.companies.basicApi.update(
      jobOutput[itemId].distantId,
      {
        properties: hubspotFieldUpdates,
      }
    );
  }
}

async function updateCompaniesItemTypeFields(
  supabase: SupabaseClient<Database>,
  hsClient: Client,
  workspace: WorkspaceT,
  op: "GET" | "UPDATE"
) {
  if (op === "GET" && workspace.item_types["COMPANIES"]?.hubspotSourceFields) {
    return workspace.item_types["COMPANIES"]?.hubspotSourceFields.map(
      (field) => field.value
    );
  } else {
    const propertiesRes = await hsClient.crm.properties.coreApi.getAll(
      "company"
    );

    const updatedItemConfig = mergeItemConfig(workspace, "COMPANIES", {
      hubspotSourceFields: propertiesRes.results.map((property) => {
        return {
          value: property.name,
          label: property.label,
        };
      }),
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

export async function fetchCompaniesPage(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceT,
  after: string | undefined
) {
  const hsClient = await newHubspotClient(workspace.refresh_token);

  const propertiesList = await updateCompaniesItemTypeFields(
    supabase,
    hsClient,
    workspace,
    after ? "GET" : "UPDATE"
  );

  const propertiesListChunks = splitArrayIntoChunks(
    propertiesList,
    MAX_HUBSPOT_PROPERTIES_PER_REQUEST
  );

  let companies: SimplePublicObjectWithAssociations[] = [];
  let nextAfter: string | undefined = undefined;

  for (const propertiesListChunk of propertiesListChunks) {
    const res = await hsClient.crm.companies.basicApi.getPage(
      100,
      after,
      propertiesListChunk
    );

    nextAfter = res.paging?.next?.after;

    if (companies.length === 0) {
      companies = res.results;
    } else {
      // Merge the results properties
      res.results.forEach((company) => {
        let existingCompany = companies.find((c) => c.id === company.id);

        if (existingCompany) {
          existingCompany.properties = {
            ...existingCompany.properties,
            ...company.properties,
          };
          // We don't merge associations as we only fetch companies
          // existingCompany.associations = {
          //   ...existingCompany.associations,
          //   ...company.associations,
          // };
        } else {
          throw new Error(
            `Company ${company.id} not found in existing companies while merging chunks.`
          );
        }
      });
    }
  }

  if (!companies || companies.length === 0) {
    return {
      after: undefined,
      items: [],
    };
  }

  let dbCompanies = companies.map((company) => {
    let dbCompany: TablesInsert<"items"> = {
      id: uuid(),
      workspace_id: workspace.id,
      distant_id: company.id,
      item_type: "COMPANIES",
      value: deleteNullKeys(company.properties),
      similarity_checked: false,
      jobs_creation_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      jobs_update_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
      filled_score: 0,
    };

    dbCompany.filled_score = listItemFields(
      workspace,
      dbCompany as Tables<"items">
    ).length;

    (dbCompany.value as any).filled_score = dbCompany.filled_score.toString();

    return dbCompany;
  });

  return {
    after: nextAfter,
    items: dbCompanies,
  };
}
