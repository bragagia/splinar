import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { DupStackRowInfos } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { URLS } from "@/lib/urls";
import { getCompanyAdress } from "@/types/companies";
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
    hubspotLink: URLS.external.hubspotCompany(workspaceHubId, company.hs_id),
    columns: [
      {
        value: company.name,
        style: "text-black font-medium basis-48",
      },
      {
        value: company.domain,
        style: "text-gray-700 basis-48",
      },
      {
        value: getCompanyAdress(company),
        style: "text-gray-700 basis-80",
      },
      {
        value: company.phone,
        style: "text-gray-700 basis-48",
      },
    ],
  };
}
