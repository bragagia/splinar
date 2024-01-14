import { inngest } from "@/inngest";
import { updateInstallItemsCount } from "@/inngest/dedup/fetch/contacts";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 3;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;

export async function fetchCompanies(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  after?: string
) {
  let pageId = 0;

  const propertiesRes = await hsClient.crm.properties.coreApi.getAll("company");
  const propertiesList = propertiesRes.results.map((property) => property.name);

  do {
    pageId++;

    if (pageId % UPDATE_COUNT_EVERY === 0) {
      await updateInstallItemsCount(supabase, workspaceId);
    }

    if (pageId % WORKER_LIMIT === 0) {
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

    const res = await hsClient.crm.companies.basicApi.getPage(
      100,
      after,
      propertiesList
    );

    const companies = res.results;

    if (!companies || companies.length === 0) {
      break;
    }

    let dbCompanies = companies.map((company) => {
      let dbCompany: TablesInsert<"items"> = {
        id: uuid(),
        workspace_id: workspaceId,
        distant_id: company.id,
        item_type: "COMPANIES",
        value: company.properties,
        dup_checked: false,
        similarity_checked: false,
        filled_score: 0,
      };

      dbCompany.filled_score = listItemFields(
        dbCompany as Tables<"items">
      ).length;

      return dbCompany;
    });

    let { error } = await supabase.from("items").insert(dbCompanies);
    if (error) {
      throw error;
    }

    after = res.paging?.next?.after;
  } while (after);

  // Final update
  await updateInstallItemsCount(supabase, workspaceId);

  await inngest.send({
    name: "workspace/contacts/fetch.start",
    data: {
      workspaceId: workspaceId,
    },
  });
}
