import {
  DupStackRowInfos,
  LinkedinLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { ItemsListField } from "@/app/workspace/[workspaceId]/duplicates/items-list-field";
import { deleteNullKeys } from "@/inngest/dedup/fetch/contacts";
import { getCompanyColumns } from "@/lib/companies";
import { newHubspotClient } from "@/lib/hubspot";
import {
  DedupConfigT,
  itemPollUpdaterT,
  listItemFields,
} from "@/lib/items_common";
import { dateCmp, getMaxs, nullCmp } from "@/lib/metadata_helpers";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";
import { DupStackItemWithItemT, DupStackWithItemsT } from "@/types/dupstacks";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { PublicObjectSearchRequest } from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs, { Dayjs } from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
dayjs.extend(relativeTime);
dayjs.extend(utc);

import stringSimilarity from "string-similarity";

export const contactsDedupConfig: DedupConfigT = {
  hubspotSourceFields: [
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
  ],
  itemNameSources: ["firstname", "lastname"],
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
      ifDifferent: "reduce-confident-reduce-potential",
    },
    {
      id: "f4301d99-295c-4491-91e2-21335110f675",
      displayName: "linkedin",
      sources: ["hs_linkedinid"],
      matchingMethod: "url",
      ifMatch: "confident",
      ifDifferent: "reduce-confident-reduce-potential",
      linkType: "linkedin",
    },
    {
      id: "7e290d76-aa92-4c4b-ae22-8236fc73070d",
      displayName: "Phones",
      sources: ["phone", "mobilephone"],
      matchingMethod: "exact",
      ifMatch: "potential",
      ifDifferent: "reduce-confident-reduce-potential",
    },
    {
      id: "3982daff-7b19-4b65-914b-d2f02b54f7d9",
      displayName: "Companies",
      sources: ["companies"],
      matchingMethod: "exact",
      ifMatch: "multiplier",
      ifDifferent: "reduce-potential",
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

export function getContactColumns(item: Tables<"items">) {
  const value = item.value as any;

  const nameExist =
    (value.firstname && value.firstname.trim() !== "") ||
    (value.lastname && value.lastname.trim() !== "");

  return {
    name: nameExist
      ? {
          firstname: value.firstname as string | null,
          lastname: value.lastname as string | null,
          fullname: [value.firstname, value.lastname]
            .filter((v) => v !== null && v !== undefined)
            .join(" ")
            .trim()
            .replaceAll("  ", " "),
        }
      : null,

    emails: [value.email].filter(
      (v) => v !== null && v !== undefined
    ) as string[], // TODO: Add additional emails

    phones: [value.mobilephone, value.phone].filter(
      (v) => v !== null && v !== undefined
    ) as string[],

    companies: (value.companies || []) as string[],

    hs_linkedinid: value.hs_linkedinid as string | null,

    hs_last_sales_activity_timestamp: value.hs_last_sales_activity_timestamp
      ? dayjs(value.hs_last_sales_activity_timestamp)
      : null, // Last Engagement Date

    notes_last_contacted: value.notes_last_contacted
      ? dayjs(value.notes_last_contacted)
      : null, // Last Contacted

    notes_last_updated: value.notes_last_updated
      ? dayjs(value.notes_last_updated)
      : null, // Last activity date

    num_contacted_notes: value.num_contacted_notes
      ? parseInt(value.num_contacted_notes as string)
      : null, // Number of times contacted
  };
}

export type ContactStackMetadataT = {
  cardTitle: string;
  bestFilledId: string | null;
  lastEngagedId: string | null;
  lastContactedId: string | null;
  lastActivityId: string | null;
  mostContactedId: string | null;
};

export function getContactStackMetadata(
  dupstack: DupStackWithItemsT
): ContactStackMetadataT {
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

  const lastEngagedIds = getMaxs(items, (a, b) => {
    const Va = getContactColumns(a).hs_last_sales_activity_timestamp;
    const Vb = getContactColumns(b).hs_last_sales_activity_timestamp;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastEngagedId =
    lastEngagedIds.length === 1 &&
    getContactColumns(lastEngagedIds[0]).hs_last_sales_activity_timestamp
      ? lastEngagedIds[0].id
      : null;

  const lastContactedIds = getMaxs(items, (a, b) => {
    const Va = getContactColumns(a).notes_last_contacted;
    const Vb = getContactColumns(b).notes_last_contacted;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastContactedId =
    lastContactedIds.length === 1 &&
    getContactColumns(lastContactedIds[0]).notes_last_contacted
      ? lastContactedIds[0].id
      : null;

  const lastActivityIds = getMaxs(items, (a, b) => {
    const Va = getContactColumns(a).notes_last_updated;
    const Vb = getContactColumns(b).notes_last_updated;
    return nullCmp(Va, Vb, (a, b) => dateCmp(a, b));
  });
  const lastActivityId =
    lastActivityIds.length === 1 &&
    getContactColumns(lastActivityIds[0]).notes_last_updated
      ? lastActivityIds[0].id
      : null;

  const mostContactedIds = getMaxs(items, (a, b) => {
    const Va = getContactColumns(a).num_contacted_notes;
    const Vb = getContactColumns(b).num_contacted_notes;
    return nullCmp(Va, Vb, (a, b) => b - a);
  });
  const mostContactedId =
    mostContactedIds.length === 1 &&
    getContactColumns(mostContactedIds[0]).num_contacted_notes
      ? mostContactedIds[0].id
      : null;

  return {
    cardTitle: "soon",
    bestFilledId: bestFilledId,
    lastEngagedId: lastEngagedId,
    lastContactedId: lastContactedId,
    lastActivityId: lastActivityId,
    mostContactedId: mostContactedId,
  };
}

export function getContactRowInfos(
  workspaceHubId: string,
  dupStackItem: DupStackItemWithItemT,
  stackMetadataG: any
): DupStackRowInfos {
  const item = dupStackItem.item;
  if (!item) {
    throw new Error("missing contact");
  }

  const stackMetadata = stackMetadataG as ContactStackMetadataT;

  const itemColumns = getContactColumns(item);

  const isLastEngaged = stackMetadata.lastEngagedId === dupStackItem.item_id;
  const isMostContacted =
    stackMetadata.mostContactedId === dupStackItem.item_id;
  const isBestFilled = stackMetadata.bestFilledId === dupStackItem.item_id;
  const isLastContacted =
    stackMetadata.lastContactedId === dupStackItem.item_id;
  const isLastActivity = stackMetadata.lastActivityId === dupStackItem.item_id;

  return {
    name: "",
    dup_type: dupStackItem.dup_type,
    columns: [
      {
        value: itemColumns.name?.fullname,
        style: "text-black font-medium",
        tips: "Full name",
        hubspotLink: URLS.external.hubspotContact(
          workspaceHubId,
          item.distant_id
        ),
      },
      {
        value: itemColumns.emails,
        style: "text-gray-700",
        tips: "Emails",
      },
      {
        value: itemColumns.phones,
        style: "text-gray-700",
        tips: "Phone numbers",
      },
      {
        value: (
          <div className="flex flex-col pt-1">
            {isLastEngaged ||
            isMostContacted ||
            isLastContacted ||
            isLastActivity ||
            isBestFilled ? (
              <>
                {isBestFilled && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-yellow-50 w-fit h-fit leading-none">
                    Best filled
                  </div>
                )}

                {isLastEngaged && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md bg-orange-50 w-fit h-fit leading-none">
                    Last engaged
                  </div>
                )}

                {isLastContacted && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-pink-50 w-fit h-fit leading-none">
                    Last contacted
                  </div>
                )}

                {isLastActivity && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-purple-50 w-fit h-fit leading-none">
                    Last activity
                  </div>
                )}

                {isMostContacted && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md  bg-red-50 w-fit h-fit leading-none">
                    Most contacted
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
Last Engagement Date: ${
          itemColumns.hs_last_sales_activity_timestamp
            ? dayjs().to(itemColumns.hs_last_sales_activity_timestamp)
            : "-"
        }
Last contacted: ${
          itemColumns.notes_last_contacted
            ? dayjs().to(itemColumns.notes_last_contacted)
            : "-"
        }
Last activity date: ${
          itemColumns.notes_last_updated
            ? dayjs().to(itemColumns.notes_last_updated)
            : "-"
        }
Number of times contacted: ${
          itemColumns.num_contacted_notes
            ? itemColumns.num_contacted_notes
            : "-"
        }
`,
      },
      {
        value: itemColumns.hs_linkedinid ? (
          <LinkedinLinkButton href={itemColumns.hs_linkedinid}>
            {itemColumns.hs_linkedinid
              ?.replace(/.*linkedin\.com(\/company)?(\/in)?\//, "")
              .replace(/\/$/, "")}
          </LinkedinLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Linkedin page",
      },
      {
        value: () => (
          <ItemsListField
            itemsDistantIds={itemColumns.companies}
            nameFn={(item: Tables<"items">) =>
              getCompanyColumns(item).name || "#" + item.distant_id
            }
            linkFn={(item: Tables<"items">) =>
              URLS.external.hubspotCompany(workspaceHubId, item.distant_id)
            }
          />
        ),
        style: "text-gray-700",
        tips: "Companies",
      },
    ],
  };
}

export const contactScoring = {
  name: {
    exact: 50,
    similar: 30,
    potential: 5,

    notMatchingMalus: -50,

    emptyBonusMultiplier: 1,
  },

  emails: {
    exact: 100,
    similar: 80,
    potential: 70,
    unlikely: 5,
    unlikelyMultiplier: 1.1,

    notMatchingMalus: -20,

    emptyBonusMultiplier: 1,
  },

  phones: {
    exact: 35, // phones can be shared like a company, but can also be unique

    notMatchingMalus: -20,

    emptyBonusMultiplier: 1,
  },

  hs_linkedinid: {
    exact: 70,
    notMatchingMalus: -30,
    emptyBonus: 0,
  },

  companies: {
    exactMultiplier: 1.4,

    notMatchingMalus: -20,
    notMatchingMalusMultiplier: 0.7,

    emptyBonusMultiplier: 1,
  },
};

export function contactSimilarityCheck(
  workspaceId: string,
  contactA: Tables<"items">,
  contactB: Tables<"items">
) {
  if (contactA.id === contactB.id) {
    return undefined;
  }

  let similarities: TablesInsert<"similarities">[] = [];

  const similarityBase: TablesInsert<"similarities"> = {
    workspace_id: workspaceId,
    item_a_id: contactA.id,
    item_b_id: contactB.id,

    // Boilerplate, will be replaced later
    field_type: "name",
    item_a_value: "",
    item_b_value: "",
    similarity_score: "unlikely",
  };

  const A = getContactColumns(contactA);
  const B = getContactColumns(contactB);

  // Name
  let aFullName = A.name?.fullname.toLowerCase();
  let bFullName = B.name?.fullname.toLowerCase();

  if (aFullName && bFullName && aFullName.length > 2 && bFullName.length > 2) {
    const fullNameSimilarityBase: TablesInsert<"similarities"> = {
      ...similarityBase,
      id: uuid(),
      field_type: "name",
      item_a_value: aFullName,
      item_b_value: bFullName,
    };

    let aStrictFullName = [
      B.name?.firstname ? A.name?.firstname : null,
      B.name?.lastname ? A.name?.lastname : null,
    ]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");
    let bStrictFullName = [
      A.name?.firstname ? B.name?.firstname : null,
      A.name?.lastname ? B.name?.lastname : null,
    ]
      .filter((v) => v !== null && v !== undefined)
      .join(" ")
      .trim()
      .toLowerCase()
      .replaceAll("  ", " ");

    if (aFullName == bFullName) {
      similarities.push({
        ...fullNameSimilarityBase,
        similarity_score: "exact",
      });
    } else {
      const compareScore = stringSimilarity.compareTwoStrings(
        aFullName,
        bFullName
      );

      if (compareScore > 0.9) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "similar",
        });
      } else if (compareScore > 0.85) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "potential",
        });
      } else if (
        stringSimilarity.compareTwoStrings(aStrictFullName, bStrictFullName) >
        0.9
      ) {
        similarities.push({
          ...fullNameSimilarityBase,
          similarity_score: "potential",
        });
      }
    }
  }

  // Emails
  const emailsFilteredA = A.emails?.filter(
    (email: string) => email.length > 4 && email.includes("@")
  );
  const emailsFilteredB = B.emails?.filter(
    (email: string) => email.length > 4 && email.includes("@")
  );

  emailsFilteredA?.forEach((emailA: string) => {
    emailsFilteredB?.forEach((emailB: string) => {
      const emailSimilarityBase: TablesInsert<"similarities"> = {
        ...similarityBase,
        id: uuid(),
        field_type: "emails",
        item_a_value: emailA,
        item_b_value: emailB,
      };

      emailA = emailA.trim();
      emailB = emailB.trim();

      if (!emailA || !emailB) {
        // We need to do this because for some ungodly reason hubspot accept " " as a valid email
        return;
      }

      if (emailA === emailB) {
        similarities.push({
          ...emailSimilarityBase,
          similarity_score: "exact",
        });
      } else {
        let removeInfiniteAddr = (str: string) => str.replace(/\+[^@]*$/, "");
        let removeUselessDots = (str: string) => str.split(".").join("");
        let removeExt = (str: string) => str.split(".").slice(0, -1).join(".");

        const idA = removeInfiniteAddr(removeUselessDots(emailA.split("@")[0]));
        const idB = removeInfiniteAddr(removeUselessDots(emailB.split("@")[0]));

        const idSimScore = stringSimilarity.compareTwoStrings(idA, idB);

        // If we met the unlikely score, we check for the rest, else with just skip
        if (idSimScore > 0.9) {
          const domainA = emailA.split("@")[1];
          const domainB = emailB.split("@")[1];

          const domainWithoutExtA = removeExt(domainA);
          const domainWithoutExtB = removeExt(domainB);

          const domainSimScore = stringSimilarity.compareTwoStrings(
            domainWithoutExtA,
            domainWithoutExtB
          );

          if (idA === idB && domainA === domainB) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "exact",
            });
          } else if (idSimScore > 0.95 && domainSimScore > 0.95) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "similar",
            });
          } else if (idSimScore > 0.95 && domainSimScore > 0.9) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "potential",
            });
          } else if (idSimScore > 0.9) {
            similarities.push({
              ...emailSimilarityBase,
              similarity_score: "unlikely",
            });
          }
        }
      }
    });
  });

  // Phones

  const phonesA = A.phones;
  const phonesB = B.phones;

  const phonesFilteredA = phonesA?.filter((phone) => phone.length > 4);
  const phonesFilteredB = phonesB?.filter((phone) => phone.length > 4);

  phonesFilteredA?.forEach((phoneA) => {
    phonesFilteredB?.forEach((phoneB) => {
      if (phoneA === phoneB) {
        similarities.push({
          ...similarityBase,
          id: uuid(),
          field_type: "phones",
          item_a_value: phoneA,
          item_b_value: phoneB,
          similarity_score: "exact",
        });
      }
    });
  });

  // linkedin
  if (
    A.hs_linkedinid &&
    B.hs_linkedinid &&
    A.hs_linkedinid.length > 3 &&
    B.hs_linkedinid.length > 3
  ) {
    const a = A.hs_linkedinid.trim().toLowerCase();
    const b = B.hs_linkedinid.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        similarities.push({
          ...similarityBase,
          id: uuid(),
          field_type: "hs_linkedinid",
          item_a_value: a,
          item_b_value: b,
          similarity_score: "exact",
        });
      }
    }
  }

  // If there is no similarities or only unlikely ones, we skip, it will greatly reduce similarities db size
  // !!!
  // Note : Comapnies check is after, because it only acts as a multiplier for the dup score, so if there is only unlikely similarities,
  // we can skip companies check too.
  // There is a loooot of contacts that share the same company so dup_stack check will be much much faster
  if (
    similarities.length === 0 ||
    !similarities.find(
      (similarity) => similarity.similarity_score !== "unlikely"
    )
  ) {
    return undefined;
  }

  // Companies
  A.companies.forEach((companyA: string) => {
    B.companies.forEach((companyB: string) => {
      const companySimilarityBase: TablesInsert<"similarities"> = {
        ...similarityBase,
        id: uuid(),
        field_type: "companies",
        item_a_value: companyA,
        item_b_value: companyB,
      };

      if (companyA === companyB) {
        similarities.push({
          ...companySimilarityBase,
          similarity_score: "exact",
        });
      }
      // } else if (companyA.name && companyB.name) {
      //   if (
      //     stringSimilarity.compareTwoStrings(companyA.name, companyB.name) >
      //     0.97
      //   ) {
      //     similarities.push({
      //       ...companySimilarityBase,
      //       similarity_score: "similar",
      //     });
      //   }
      // }
    });
  });

  const scoreRanking: { [key: string]: number } = {
    exact: 4,
    similar: 3,
    potential: 2,
    unlikely: 1,
  };

  let filtered: {
    [key: string]: TablesInsert<"similarities">;
  } = {};

  for (let entry of similarities) {
    if (
      !filtered[entry.field_type] ||
      scoreRanking[entry.similarity_score] >
        scoreRanking[filtered[entry.field_type].similarity_score]
    ) {
      filtered[entry.field_type] = entry;
    }
  }

  const filteredValues: TablesInsert<"similarities">[] =
    Object.values(filtered);

  return filteredValues;
}

export async function contactsPollUpdater(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  startFilter: Dayjs,
  endFilter: Dayjs,
  after?: string
): Promise<itemPollUpdaterT> {
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
            operator: "GTE",
            value: startFilter.utc().toISOString(),
          },
          {
            propertyName: "lastmodifieddate",
            operator: "LTE",
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
      dup_checked: false,
      filled_score: 0, // Calculated below
    };

    dbContact.filled_score = listItemFields(
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
