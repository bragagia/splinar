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
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorContacts || contactsCount === null) {
    throw errorContacts || new Error("Missing contact count");
  }

  const { count: companiesCount, error: errorCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorCompanies || companiesCount === null) {
    throw errorCompanies || new Error("Missing companies count");
  }

  const roundItemsCount = Math.ceil((companiesCount + contactsCount) / 1000);

  return {
    contactsTotal: contactsCount,
    companiesTotal: companiesCount,
    usage: roundItemsCount,
    usagePrice: roundItemsCount * 1,
    priceTotal: roundItemsCount * 1 + 10,
  };
}
