import { inngest } from "@/inngest";
import { calcCompanyFilledScore } from "@/inngest/dedup/list-company-fields";
import { uuid } from "@/lib/uuid";
import { InsertCompanyType } from "@/types/companies";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 3;

export async function fetchCompanies(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  after?: string
) {
  let pageId = 0;

  do {
    pageId++;

    if (pageId % UPDATE_COUNT_EVERY === 0) {
      await updateInstallCount(supabase, workspaceId);

      await inngest.send({
        name: "workspace/companies/fetch.start",
        data: {
          workspaceId: workspaceId,
          after: after,
        },
      });

      return;
    }

    console.log("Fetching companies page ", after);

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

    const companies = res.results;

    if (!companies || companies.length === 0) {
      break;
    }

    let dbCompanies = companies.map((company) => {
      let dbCompany: InsertCompanyType = {
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
        filled_score: 0,
      };

      dbCompany.filled_score = calcCompanyFilledScore(dbCompany);

      return dbCompany;
    });

    let { error } = await supabase.from("companies").insert(dbCompanies);
    if (error) {
      throw error;
    }

    after = res.paging?.next?.after;
  } while (after);

  // Final update
  await updateInstallCount(supabase, workspaceId);

  await inngest.send({
    name: "workspace/contacts/fetch.start",
    data: {
      workspaceId: workspaceId,
    },
  });
}

async function updateInstallCount(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const companies = await supabase
    .from("companies")
    .select("", { count: "exact" })
    .eq("workspace_id", workspaceId);
  if (companies.error) {
    throw companies.error;
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_companies_count: companies.count || 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }
}
