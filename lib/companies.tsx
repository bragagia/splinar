import {
  DupStackRowInfos,
  FacebookLinkButton,
  LinkedinLinkButton,
  StandardLinkButton,
  TwitterLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import {
  convertOutputPropertyToHubspotProperty,
  newHubspotClient,
} from "@/lib/hubspot";
import {
  DedupConfigT,
  JobOutputByItemId,
  areSimilaritiesSourceFieldsDifferent,
  getItemTypeConfig,
  itemPollUpdaterT,
  listItemFields,
} from "@/lib/items_common";
import { dateCmp, getMaxs, nullCmp } from "@/lib/metadata_helpers";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";
import { DupStackItemWithItemT, DupStackWithItemsT } from "@/types/dupstacks";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
} from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs, { Dayjs } from "dayjs";
import stringSimilarity from "string-similarity";

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

export const companiesDedupConfig: DedupConfigT = {
  hubspotSourceFields: [
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
  ],
  itemNameSources: ["name"],
  fields: [
    {
      id: "81aa1ed0-ce0d-4b4e-8f49-99a5c4fdf26f",
      displayName: "Name",
      sources: ["name"],
      matchingMethod: "name",
      ifMatch: "potential",
      ifDifferent: "prevent-confident-reduce-potential",
      linkType: "hubspot",
      fastSimilaritiesCompatible: true,
    },
    {
      id: "aecc092d-cdcf-477e-96ee-8fd8371982ff",
      displayName: "Website",
      sources: ["domain", "website"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident",
      linkType: "external",
      fastSimilaritiesCompatible: true,
    },
    {
      id: "a01d710d-6c50-43b2-ae37-a306ff22c4ea",
      displayName: "LinkedIn",
      sources: ["linkedin_company_page"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "linkedin",
      fastSimilaritiesCompatible: true,
    },
    {
      id: "c729d617-d4a6-435b-a94d-6f1dbc3e6274",
      displayName: "Phones",
      sources: ["phone"],
      matchingMethod: "exact",
      ifMatch: "confident",
      ifDifferent: "reduce-confident",
      fastSimilaritiesCompatible: true,
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
      fastSimilaritiesCompatible: true,
    },
    {
      id: "70655159-9477-422b-8add-9983ec5a6a61",
      displayName: "Twitter",
      sources: ["twitterhandle"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "twitter",
      fastSimilaritiesCompatible: true,
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

export function getCompanyColumns(item: Tables<"items">) {
  const value = item.value as any;

  const address = [
    value.address,
    value.zip,
    value.city,
    value.state,
    value.country,
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(" ");

  return {
    name: value.name as string | null,
    domain: value.domain as string | null,
    linkedin_company_page: value.linkedin_company_page as string | null,
    phone: value.phone as string | null,
    address: address !== "" ? address : null,
    facebook_company_page: value.facebook_company_page as string | null,
    twitterhandle: value.twitterhandle as string | null,

    hs_last_booked_meeting_date: value.hs_last_booked_meeting_date
      ? dayjs(value.hs_last_booked_meeting_date)
      : null, // Last Booked Meeting Date

    hs_last_logged_call_date: value.hs_last_logged_call_date
      ? dayjs(value.hs_last_logged_call_date)
      : null, // Last Logged Call Date

    hs_last_open_task_date: value.hs_last_open_task_date
      ? dayjs(value.hs_last_open_task_date)
      : null, // Last Open Task Date

    hs_last_sales_activity_timestamp: value.hs_last_sales_activity_timestamp
      ? dayjs(value.hs_last_sales_activity_timestamp)
      : null, // Last Engagement Date

    notes_last_contacted: value.notes_last_contacted
      ? dayjs(value.notes_last_contacted)
      : null, // Last Contacted

    notes_last_updated: value.notes_last_updated
      ? dayjs(value.notes_last_updated)
      : null, // Last Activity Date
  };
}

export type CompanyStackMetadataT = {
  cardTitle: string;
  bestFilledId: string | null;
  lastBookedMeetingId: string | null;
  lastLoggedCallId: string | null;
  lastOpenTaskId: string | null;
  lastEngagedId: string | null;
  lastContactedId: string | null;
  lastActivityId: string | null;
};

export function getCompanyStackMetadata(
  dupstack: DupStackWithItemsT
): CompanyStackMetadataT {
  const items = dupstack.dup_stack_items
    .sort()
    .filter(
      (dupstackItem) =>
        dupstackItem.dup_type === "CONFIDENT" ||
        dupstackItem.dup_type === "REFERENCE"
    )
    .map((dupstackItem) => dupstackItem.item) as Tables<"items">[];

  const bestFilledIds = getMaxs(
    items,
    (a, b) => b.filled_score - a.filled_score
  );
  const bestFilledId = bestFilledIds.length === 1 ? bestFilledIds[0].id : null;

  const lastBookedMeetingIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).hs_last_booked_meeting_date;
    const Vb = getCompanyColumns(b).hs_last_booked_meeting_date;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastBookedMeetingId =
    lastBookedMeetingIds.length === 1 &&
    getCompanyColumns(lastBookedMeetingIds[0]).hs_last_booked_meeting_date
      ? lastBookedMeetingIds[0].id
      : null;

  const lastLoggedCallIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).hs_last_logged_call_date;
    const Vb = getCompanyColumns(b).hs_last_logged_call_date;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastLoggedCallId =
    lastLoggedCallIds.length === 1 &&
    getCompanyColumns(lastLoggedCallIds[0]).hs_last_logged_call_date
      ? lastLoggedCallIds[0].id
      : null;

  const lastOpenTaskIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).hs_last_open_task_date;
    const Vb = getCompanyColumns(b).hs_last_open_task_date;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastOpenTaskId =
    lastOpenTaskIds.length === 1 &&
    getCompanyColumns(lastOpenTaskIds[0]).hs_last_open_task_date
      ? lastOpenTaskIds[0].id
      : null;

  const lastEngagedIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).hs_last_sales_activity_timestamp;
    const Vb = getCompanyColumns(b).hs_last_sales_activity_timestamp;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastEngagedId =
    lastEngagedIds.length === 1 &&
    getCompanyColumns(lastEngagedIds[0]).hs_last_sales_activity_timestamp
      ? lastEngagedIds[0].id
      : null;

  const lastContactedIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).notes_last_contacted;
    const Vb = getCompanyColumns(b).notes_last_contacted;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastContactedId =
    lastContactedIds.length === 1 &&
    getCompanyColumns(lastContactedIds[0]).notes_last_contacted
      ? lastContactedIds[0].id
      : null;

  const lastActivityIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).notes_last_updated;
    const Vb = getCompanyColumns(b).notes_last_updated;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastActivityId =
    lastActivityIds.length === 1 &&
    getCompanyColumns(lastActivityIds[0]).notes_last_updated
      ? lastActivityIds[0].id
      : null;

  return {
    cardTitle: "soon",
    bestFilledId: bestFilledId,
    lastBookedMeetingId: lastBookedMeetingId,
    lastLoggedCallId: lastLoggedCallId,
    lastOpenTaskId: lastOpenTaskId,
    lastEngagedId: lastEngagedId,
    lastContactedId: lastContactedId,
    lastActivityId: lastActivityId,
  };
}

export function getCompanyRowInfos(
  workspaceHubId: string,
  dupStackItem: DupStackItemWithItemT,
  stackMetadataG: any
): DupStackRowInfos {
  const item = dupStackItem.item;
  if (!item) {
    throw new Error("missing company");
  }

  const itemValue = getCompanyColumns(item);

  const stackMetadata = stackMetadataG as CompanyStackMetadataT;

  const isBestFilled = stackMetadata.bestFilledId === dupStackItem.item_id;
  const isLastBooked =
    stackMetadata.lastBookedMeetingId === dupStackItem.item_id;
  const isLastLoggedCall =
    stackMetadata.lastLoggedCallId === dupStackItem.item_id;
  const isLastOpenedTask =
    stackMetadata.lastOpenTaskId === dupStackItem.item_id;
  const isLastEngaged = stackMetadata.lastEngagedId === dupStackItem.item_id;
  const isLastContacted =
    stackMetadata.lastContactedId === dupStackItem.item_id;
  const isLastActivity = stackMetadata.lastActivityId === dupStackItem.item_id;

  return {
    name: "",
    dup_type: dupStackItem.dup_type,
    columns: [
      {
        value: itemValue.name,
        style: "text-black font-medium",
        tips: "Name",
        hubspotLink: URLS.external.hubspotCompany(
          workspaceHubId,
          item.distant_id
        ),
      },

      {
        value: itemValue.domain ? (
          <StandardLinkButton href={"https://" + itemValue.domain}>
            {itemValue.domain}
          </StandardLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Domain",
      },

      {
        value: itemValue.linkedin_company_page ? (
          <LinkedinLinkButton href={itemValue.linkedin_company_page}>
            {itemValue.linkedin_company_page?.replace(
              /.*linkedin\.com(\/company)?\//,
              ""
            )}
          </LinkedinLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Linkedin page",
      },

      {
        value: (
          <div className="flex flex-col pt-1">
            {isBestFilled ||
            isLastBooked ||
            isLastLoggedCall ||
            isLastOpenedTask ||
            isLastEngaged ||
            isLastContacted ||
            isLastActivity ? (
              <>
                {isBestFilled && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-yellow-50 w-fit h-fit leading-none">
                    Best filled
                  </div>
                )}

                {isLastBooked && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-pink-50 w-fit h-fit leading-none">
                    Last booked
                  </div>
                )}

                {isLastLoggedCall && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-purple-50 w-fit h-fit leading-none">
                    Last Logged Call
                  </div>
                )}

                {isLastOpenedTask && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-violet-50 w-fit h-fit leading-none">
                    Last Opened Task
                  </div>
                )}

                {isLastEngaged && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-fuchsia-50 w-fit h-fit leading-none">
                    Last Engaged
                  </div>
                )}

                {isLastContacted && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-lime-50 w-fit h-fit leading-none">
                    Last Contacted
                  </div>
                )}

                {isLastActivity && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-emerald-50 w-fit h-fit leading-none">
                    Last Activity
                  </div>
                )}
              </>
            ) : (
              <span
                className={cn("text-gray-400 font-light w-full max-w-full")}
              >
                -
              </span>
            )}
          </div>
        ),
        style: "text-gray-700",
        tips: `
Fields with values: ${item.filled_score}
Last Booked Meeting Date: ${
          itemValue.hs_last_booked_meeting_date
            ? dayjs().to(itemValue.hs_last_booked_meeting_date)
            : "-"
        }
Last Logged Call Date: ${
          itemValue.hs_last_logged_call_date
            ? dayjs().to(itemValue.hs_last_logged_call_date)
            : "-"
        }
Last Open Task Date: ${
          itemValue.hs_last_open_task_date
            ? dayjs().to(itemValue.hs_last_open_task_date)
            : "-"
        }
Last Engagement Date: ${
          itemValue.hs_last_sales_activity_timestamp
            ? itemValue.hs_last_sales_activity_timestamp
            : "-"
        }
Last Contacted: ${
          itemValue.notes_last_contacted ? itemValue.notes_last_contacted : "-"
        }
Last Activity Date: ${
          itemValue.notes_last_updated ? itemValue.notes_last_updated : "-"
        }
`,
      },

      {
        value: itemValue.phone,
        style: "text-gray-700",
        tips: "Phone number",
      },

      {
        value: itemValue.address,
        style: "text-gray-700 text-xs",
        tips: "Physical address",
      },

      {
        value: itemValue.facebook_company_page ? (
          <FacebookLinkButton href={itemValue.facebook_company_page}>
            {itemValue.facebook_company_page?.replace(/.*facebook\.com\//, "")}
          </FacebookLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Facebook page",
      },

      {
        value: itemValue.twitterhandle ? (
          <TwitterLinkButton href={"https://x.com/" + itemValue.twitterhandle}>
            {itemValue.twitterhandle}
          </TwitterLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "X/Twitter page",
      },
    ],
  };
}

export const companyScoring = {
  name: {
    exact: 40,
    similar: 30,
    potential: 20,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  domain: {
    exact: 70,
    similar: 40,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  facebook_company_page: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  linkedin_company_page: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  phone: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  twitterhandle: {
    exact: 70,
    notMatchingMalus: -40,
    emptyBonus: 0,
  },

  full_address: {},
};

export function companiesSimilarityCheck(
  workspaceId: string,
  companyA: Tables<"items">,
  companyB: Tables<"items">
) {
  if (companyA.id === companyB.id) {
    return undefined;
  }

  let similarities: TablesInsert<"similarities">[] = [];

  const addSimilarity = (
    field_type: string,
    valueA: string,
    valueB: string,
    similarity_score: TablesInsert<"similarities">["similarity_score"]
  ) => {
    similarities.push({
      id: uuid(),

      workspace_id: workspaceId,
      item_a_id: companyA.id,
      item_b_id: companyB.id,

      field_type: field_type,
      item_a_value: valueA,
      item_b_value: valueB,
      similarity_score: similarity_score,
    });
  };

  const companyAValue = getCompanyColumns(companyA);
  const companyBValue = getCompanyColumns(companyB);

  // Name
  if (
    companyAValue.name &&
    companyBValue.name &&
    companyAValue.name.length > 2 &&
    companyBValue.name.length > 2
  ) {
    let a = companyAValue.name.trim().toLowerCase().replaceAll("  ", " ");
    let b = companyBValue.name.trim().toLowerCase().replaceAll("  ", " ");

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("name", a, b, "exact");
      } else {
        const compareScore = stringSimilarity.compareTwoStrings(a, b);

        if (compareScore > 0.95) {
          addSimilarity("name", a, b, "similar");
        } else if (compareScore > 0.9) {
          addSimilarity("name", a, b, "potential");
        }
      }
    }
  }

  // Domain
  if (
    companyAValue.domain &&
    companyBValue.domain &&
    companyAValue.domain.length > 3 &&
    companyBValue.domain.length > 3
  ) {
    const a = companyAValue.domain.trim().toLowerCase();
    const b = companyBValue.domain.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("domain", a, b, "exact");
      } else {
        const removeExt = (str: string) =>
          str.split(".").slice(0, -1).join(".");

        if (removeExt(a) === removeExt(b)) {
          addSimilarity("domain", a, b, "similar");
        }
      }
    }
  }

  // facebook_company_page
  if (
    companyAValue.facebook_company_page &&
    companyBValue.facebook_company_page &&
    companyAValue.facebook_company_page.length > 3 &&
    companyBValue.facebook_company_page.length > 3
  ) {
    const a = companyAValue.facebook_company_page.trim().toLowerCase();
    const b = companyBValue.facebook_company_page.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("facebook_company_page", a, b, "exact");
      }
    }
  }

  // linkedin_company_page
  if (
    companyAValue.linkedin_company_page &&
    companyBValue.linkedin_company_page &&
    companyAValue.linkedin_company_page.length > 3 &&
    companyBValue.linkedin_company_page.length > 3
  ) {
    const a = companyAValue.linkedin_company_page.trim().toLowerCase();
    const b = companyBValue.linkedin_company_page.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("linkedin_company_page", a, b, "exact");
      }
    }
  }

  // twitterhandle
  if (
    companyAValue.twitterhandle &&
    companyBValue.twitterhandle &&
    companyAValue.twitterhandle.length > 2 &&
    companyBValue.twitterhandle.length > 2
  ) {
    const a = companyAValue.twitterhandle.trim().toLowerCase();
    const b = companyBValue.twitterhandle.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("twitterhandle", a, b, "exact");
      }
    }
  }

  // phone
  if (
    companyAValue.phone &&
    companyBValue.phone &&
    companyAValue.phone.length > 4 &&
    companyBValue.phone.length > 4
  ) {
    const a = companyAValue.phone.trim().toLowerCase();
    const b = companyBValue.phone.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("phone", a, b, "exact");
      }
    }
  }

  // full_address
  // -> Ignore for now

  return similarities;
}

export async function companiesPollUpdater(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  startFilter: Dayjs,
  endFilter: Dayjs,
  after?: string
): Promise<itemPollUpdaterT> {
  const itemTypeConfig = getItemTypeConfig("COMPANIES");

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
