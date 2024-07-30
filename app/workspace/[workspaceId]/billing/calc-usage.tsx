import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function calcWorkspaceUsage(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  return (await calcWorkspaceUsageDetailed(supabase, workspaceId)).usage;
}

export async function calcWorkspaceUsageDetailed(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  // ! TODO: Calc from hubspot when needed

  const { count: contactsCount, error: errorContacts } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("item_type", "CONTACTS")
    .is("merged_in_distant_id", null)
    .limit(0);
  if (errorContacts || contactsCount === null) {
    throw errorContacts || new Error("Missing contact count");
  }

  const { count: companiesCount, error: errorCompanies } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("item_type", "COMPANIES")
    .is("merged_in_distant_id", null)
    .limit(0);
  if (errorCompanies || companiesCount === null) {
    throw errorCompanies || new Error("Missing companies count");
  }

  const { count: dealsCount, error: errorDeals } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("item_type", "DEALS")
    .is("merged_in_distant_id", null)
    .limit(0);
  if (errorDeals || dealsCount === null) {
    throw errorDeals || new Error("Missing deals count");
  }

  const roundItemsCount = Math.ceil(
    (companiesCount + contactsCount + dealsCount) / 1000
  );

  return {
    contactsTotal: contactsCount,
    companiesTotal: companiesCount,
    usage: roundItemsCount,
    usagePrice: roundItemsCount * 1,
    priceTotal: roundItemsCount * 1,
  };
}
