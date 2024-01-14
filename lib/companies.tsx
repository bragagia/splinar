import {
  DupStackRowInfos,
  FacebookLinkButton,
  LinkedinLinkButton,
  StandardLinkButton,
  TwitterLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { URLS } from "@/lib/urls";
import { uuid } from "@/lib/uuid";
import { DupStackItemWithItemT } from "@/types/dupstacks";
import { Tables, TablesInsert } from "@/types/supabase";
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
    website: value.website as string | null,
  };
}

export function getCompanyRowInfos(
  workspaceHubId: string,
  dupStackItem: DupStackItemWithItemT
): DupStackRowInfos {
  const item = dupStackItem.item;
  if (!item) {
    throw new Error("missing company");
  }

  const itemValue = getCompanyColumns(item);

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
          <StandardLinkButton href={itemValue.domain}>
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

      {
        value: itemValue.website ? (
          <StandardLinkButton href={itemValue.website}>
            {itemValue.website}
          </StandardLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Website",
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

  website: {
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

  // website
  if (
    companyAValue.website &&
    companyBValue.website &&
    companyAValue.website.length > 3 &&
    companyBValue.website.length > 3
  ) {
    const a = companyAValue.website.trim().toLowerCase();
    const b = companyBValue.website.trim().toLowerCase();

    if (a !== "" && b !== "") {
      if (a == b) {
        addSimilarity("website", a, b, "exact");
      } else {
        const removeExt = (str: string) =>
          str.split(".").slice(0, -1).join(".");

        if (removeExt(a) === removeExt(b)) {
          addSimilarity("website", a, b, "similar");
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
