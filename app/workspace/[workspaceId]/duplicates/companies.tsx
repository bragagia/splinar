import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import {
  DupStackRowInfos,
  FacebookLinkButton,
  LinkedinLinkButton,
  StandardLinkButton,
  TwitterLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { URLS } from "@/lib/urls";
import { getCompanyAddress } from "@/types/companies";
import { DupStackCompanyItemWithCompanyType } from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function nextCompaniesPage(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  nextCursor: string | undefined
) {
  let query = supabase
    .from("dup_stacks")
    .select("*, dup_stack_items:dup_stack_companies(*, company:companies(*))")
    .limit(PAGE_SIZE)
    .eq("workspace_id", workspaceId)
    .eq("item_type", "COMPANIES")
    .order("created_at", { ascending: true });

  if (nextCursor) {
    query = query.gt("created_at", nextCursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let newNextCursor: string | undefined = undefined;
  if (data.length > 0) {
    newNextCursor = data[data.length - 1].created_at;
  }

  return { newDupStacks: data, newNextCursor: newNextCursor };
}

export function getCompanyCardTitle(
  items: DupStackCompanyItemWithCompanyType[]
) {
  return items.reduce((acc, dupStackContact) => {
    let name = (dupStackContact.company?.name || "").trim();

    return name.length > acc.length ? name : acc;
  }, "");
}

export function sortCompaniesItems(
  items: DupStackCompanyItemWithCompanyType[]
) {
  return items.sort((a, b) => {
    if (!a.company || !b.company) return 0;

    if (a.company?.filled_score !== b.company?.filled_score)
      return b.company.filled_score - a.company.filled_score;

    return b.company.hs_id - a.company.hs_id;
  });
}

export function saveNewCompanyDupType(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackId: string,
  itemId: string,
  newDupType: DupItemTypeType
) {
  supabase
    .from("dup_stack_companies")
    .update({ dup_type: newDupType })
    .eq("workspace_id", workspaceId)
    .eq("company_id", itemId)
    .eq("dupstack_id", dupstackId)
    .then(); // TODO: error loggin
}

export function getCompanyRowInfos(
  workspaceHubId: string,
  item: DupStackCompanyItemWithCompanyType
): DupStackRowInfos {
  const company = item.company;
  if (!company) {
    throw new Error("missing company");
  }

  return {
    dup_type: item.dup_type,
    columns: [
      {
        value: company.name,
        style: "text-black font-medium",
        tips: "Name",
        hubspotLink: URLS.external.hubspotCompany(
          workspaceHubId,
          company.hs_id
        ),
      },

      {
        value: company.domain ? (
          <StandardLinkButton href={company.domain}>
            {company.domain}
          </StandardLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Domain",
      },

      {
        value: company.linkedin_company_page ? (
          <LinkedinLinkButton href={company.linkedin_company_page}>
            {company.linkedin_company_page?.replace(
              /.*linkedin\.com(\/company)?\//,
              ""
            )}
          </LinkedinLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Linkedin page",
      },

      {
        value: company.phone,
        style: "text-gray-700",
        tips: "Phone number",
      },

      {
        value: getCompanyAddress(company),
        style: "text-gray-700 text-xs",
        tips: "Physical address",
      },

      {
        value: company.facebook_company_page ? (
          <FacebookLinkButton href={company.facebook_company_page}>
            {company.facebook_company_page?.replace(/.*facebook\.com\//, "")}
          </FacebookLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Facebook page",
      },

      {
        value: company.twitterhandle ? (
          <TwitterLinkButton href={"https://x.com/" + company.twitterhandle}>
            {company.twitterhandle}
          </TwitterLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "X/Twitter page",
      },

      {
        value: company.website ? (
          <StandardLinkButton href={company.website}>
            {company.website}
          </StandardLinkButton>
        ) : null,
        style: "text-gray-700",
        tips: "Website",
      },
    ],
  };
}
