import { HsCompanyType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

export async function fetchCompanies(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  let after: string | undefined = undefined;
  let pageId = 0;

  do {
    pageId++;
    console.log("Fetching companies page ", pageId);
    const res = await hsClient.crm.companies.basicApi.getPage(100, after, [
      "name",
    ]);

    after = res.paging?.next?.after;

    const companies = res.results;

    if (!companies || companies.length === 0) {
      return;
    }

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
  } while (after);
}
