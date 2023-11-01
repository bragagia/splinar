import { Database } from "@/types/supabase";
import { HsCompanyType } from "@/utils/database-types";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

export async function fetchCompanies(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const companies = await hsClient.crm.companies.getAll(
    undefined,
    undefined,
    ["name"],
    undefined,
    undefined
  );

  let dbCompanies = companies.map((company) => {
    let dbCompany: HsCompanyType = {
      id: nanoid(),
      workspace_id: workspaceId,
      hs_id: company.id,
      name: company.properties.name,
    };

    return dbCompany;
  });

  let { error } = await supabase.from("hs_companies").insert(dbCompanies);
  if (error) {
    throw error;
  }

  return dbCompanies;
}
