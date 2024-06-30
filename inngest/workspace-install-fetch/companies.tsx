import { inngest } from "@/inngest";
import { updateInstallItemsCount } from "@/inngest/workspace-install-fetch/install";
import { splitArrayIntoChunks } from "@/lib/arrays";
import { deleteNullKeys } from "@/lib/companies";
import { listItemFields } from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SimplePublicObjectWithAssociations } from "@hubspot/api-client/lib/codegen/crm/companies";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 6;
const WORKER_LIMIT = 4 * UPDATE_COUNT_EVERY;
const MAX_PROPERTIES_PER_REQUEST = 500; // Has been tested to work up to 615

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
  const propertiesListChunks = splitArrayIntoChunks(
    propertiesList,
    MAX_PROPERTIES_PER_REQUEST
  );

  do {
    console.log("Fetching companies page ", after);

    let companies: SimplePublicObjectWithAssociations[] = [];
    let nextAfter: string | undefined = undefined;

    for (const propertiesListChunk of propertiesListChunks) {
      const res = await hsClient.crm.companies.basicApi.getPage(
        100,
        after,
        propertiesListChunk
      );

      nextAfter = res.paging?.next?.after;

      if (companies.length === 0) {
        companies = res.results;
      } else {
        // Merge the results properties
        res.results.forEach((company) => {
          let existingCompany = companies.find((c) => c.id === company.id);

          if (existingCompany) {
            existingCompany.properties = {
              ...existingCompany.properties,
              ...company.properties,
            };
            // We don't merge associations as we only fetch companies
            // existingCompany.associations = {
            //   ...existingCompany.associations,
            //   ...company.associations,
            // };
          } else {
            throw new Error(
              `Company ${company.id} not found in existing companies while merging chunks.`
            );
          }
        });
      }
    }

    after = nextAfter;

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
        similarity_checked: false,
        jobs_creation_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
        jobs_update_executed: true, // True, because it's the first install and we don't want future jobs to execute on them
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
