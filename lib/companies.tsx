import {
  DupStackRowInfos,
  FacebookLinkButton,
  LinkedinLinkButton,
  StandardLinkButton,
  TwitterLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { dateCmp, getMaxs, nullCmp } from "@/lib/metadata_helpers";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";
import { DupStackItemWithItemT, DupStackWithItemsT } from "@/types/dupstacks";
import { Tables, TablesInsert } from "@/types/supabase";
import dayjs from "dayjs";
import stringSimilarity from "string-similarity";

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

    hs_createdate: value.hs_createdate ? dayjs(value.hs_createdate) : null, // Object create date/time

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
  firstCreatedId: string | null;
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

  const firstCreatedIds = getMaxs(items, (a, b) => {
    const Va = getCompanyColumns(a).hs_createdate;
    const Vb = getCompanyColumns(b).hs_createdate;
    return nullCmp(Va, Vb, (a, b) => -dateCmp(a, b));
  });
  const firstCreatedId =
    firstCreatedIds.length === 1 &&
    getCompanyColumns(firstCreatedIds[0]).hs_createdate
      ? firstCreatedIds[0].id
      : null;

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
    firstCreatedId: firstCreatedId,
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
  const isFirstCreated = stackMetadata.firstCreatedId === dupStackItem.item_id;
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
            isFirstCreated ||
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

                {isFirstCreated && (
                  <div className="-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md bg-orange-50 w-fit h-fit leading-none">
                    First created
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
                    Last Engagement Date
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
Date created: ${
          itemValue.hs_createdate ? dayjs().to(itemValue.hs_createdate) : "-"
        }
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
