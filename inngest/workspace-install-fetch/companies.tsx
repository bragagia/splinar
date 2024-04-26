import { inngest } from "@/inngest";
import { deleteNullKeys } from "@/inngest/workspace-install-fetch/contacts";
import { updateInstallItemsCount } from "@/inngest/workspace-install-fetch/install";
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
  operationId: string,
  after?: string
) {
  let pageId = 0;

  const propertiesRes = await hsClient.crm.properties.coreApi.getAll("company");
  const propertiesList = propertiesRes.results.map((property) => property.name);

  do {
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
        value: deleteNullKeys(company.properties),
        dup_checked: false,
        similarity_checked: false,
        filled_score: 0,
      };

      dbCompany.filled_score = listItemFields(
        dbCompany as Tables<"items">
      ).length;

      (dbCompany.value as any).filled_score = dbCompany.filled_score.toString();

      return dbCompany;
    });

    let { error } = await supabase
      .from("items")
      .upsert(dbCompanies, { onConflict: "workspace_id,item_type,distant_id" });
    if (error) {
      throw error;
    }

    after = res.paging?.next?.after;

    pageId++;
    if (after) {
      if (pageId % UPDATE_COUNT_EVERY === 0) {
        await updateInstallItemsCount(supabase, workspaceId, operationId);
      }

      if (pageId % WORKER_LIMIT === 0) {
        await inngest.send({
          name: "workspace/install/fetch/companies.start",
          data: {
            workspaceId: workspaceId,
            operationId: operationId,
            after: after,
          },
        });

        return;
      }
    }
  } while (after);

  // Final update
  await updateInstallItemsCount(supabase, workspaceId, operationId);

  await inngest.send({
    name: "workspace/install/fetch/contacts.start",
    data: {
      workspaceId: workspaceId,
      operationId: operationId,
    },
  });
}
