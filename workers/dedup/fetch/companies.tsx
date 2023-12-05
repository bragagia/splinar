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
      "address",
      "zip",
      "city",
      "state",
      "country",

      "domain",
      "website",
      "hubspot_owner_id",
      "name",
      "phone",

      "facebook_company_page",
      "linkedin_company_page",
      "twitterhandle",
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

        address: company.properties.address,
        zip: company.properties.zip,
        city: company.properties.city,
        state: company.properties.state,
        country: company.properties.country,

        domain: company.properties.domain,
        website: company.properties.website,
        owner_hs_id: company.properties.hubspot_owner_id
          ? parseInt(company.properties.hubspot_owner_id)
          : null,
        name: company.properties.name,
        phone: company.properties.phone,

        facebook_company_page: company.properties.facebook_company_page,
        linkedin_company_page: company.properties.linkedin_company_page,
        twitterhandle: company.properties.twitterhandle,

        dup_checked: false,
        similarity_checked: false,
        filled_score: 0, // ! TODO:
      };

      return dbCompany;
    });

    let { error } = await supabase.from("companies").insert(dbCompanies);
    if (error) {
      throw error;
    }
  } while (after);
}
