import { uuid } from "@/lib/uuid";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

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
      let dbCompany: Database["public"]["Tables"]["companies"]["Insert"] = {
        id: uuid(),
        workspace_id: workspaceId,
        hs_id: parseInt(company.id),
        name: company.properties.name,
      };

      return dbCompany;
    });

    let { error } = await supabase.from("companies").insert(dbCompanies);
    if (error) {
      throw error;
    }
  } while (after);
}
