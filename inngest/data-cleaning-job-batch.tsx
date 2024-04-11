import { Database } from "@/types/supabase";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  { id: "data-cleaning-job-batch", retries: 0 },
  { event: "data-cleaning/job/batch.start" },
  async ({ event, step, logger }) => {
    const { workspaceId, jobId } = event.data;

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspace, error: errorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select()
      .eq("id", workspaceId)
      .single();
    if (errorWorkspace) {
      throw errorWorkspace;
    }

    const { data: job, error: errorJob } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .select()
      .eq("id", jobId)
      .single();
    if (errorJob) {
      throw errorJob;
    }
  }
);

import { newHubspotClient } from "@/lib/hubspot";
import { getItemTypeConfig, getItemValueAsArray } from "@/lib/items_common";
import { Tables } from "@/types/supabase";
import stringSimilarity from "string-similarity";

export async function runDataCleaningJobOnSubset(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  jobId: string,
  itemIds: string[]
) {
  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .single();
  if (errorWorkspace) {
    throw errorWorkspace;
  }

  const { data: job, error: errorJob } = await supabase
    .from("data_cleaning_job_validated")
    .select()
    .eq("data_cleaning_job_id", jobId)
    .single();
  if (errorJob) {
    throw errorJob;
  }

  const hsClient = await newHubspotClient(workspace.refresh_token);

  const { data: items, error } = await supabase
    .from("items")
    .select()
    .in("id", itemIds)
    .eq("workspace_id", workspaceId);
  if (error) {
    throw error;
  }

  const itemsById = getById(items);

  const jobOutput = runCodeJobOnItems(items, job.code);

  // TODO: missing await
  Object.keys(jobOutput).forEach(async (itemId) => {
    const itemType = getItemTypeConfig(itemsById[itemId].item_type);

    const hubspotFieldUpdates = Object.keys(jobOutput[itemId]).reduce(
      (acc, fieldName) => {
        acc[fieldName] = convertOutputPropertyToHubspotProperty(
          jobOutput[itemId][fieldName]
        );
        return acc;
      },
      {} as { [key: string]: string }
    );

    console.log("Updating item", itemId, "with", hubspotFieldUpdates);

    const res = await hsClient.crm.contacts.basicApi.update(
      itemsById[itemId].distant_id,
      {
        properties: hubspotFieldUpdates,
      }
    );

    console.log(res);
  });
}

function convertOutputPropertyToHubspotProperty(
  outputProperty: string[] | null | undefined
): string {
  if (outputProperty === null || outputProperty === undefined) {
    return "";
  }

  return outputProperty.join(";");
}

type ObjectWithId = {
  id: string;
};

function getById<T extends ObjectWithId>(items: T[]): { [key: string]: T } {
  let ret: { [key: string]: T } = {};

  items.forEach((item) => {
    ret[item.id] = item;
  });

  return ret;
}

declare global {
  var stringSimScore: (s1: string, s2: string) => number;
}

export type JobOutputByItemId = {
  [key: string]: {
    [key: string]: string[] | null | undefined;
  };
};

// runCodeJobOnItems take a set of items as input and return the same set of items with the fields modified by the job
function runCodeJobOnItems(
  items: Tables<"items">[],
  code: string
): JobOutputByItemId {
  let editedFieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  } = {};

  try {
    global.stringSimScore = stringSimilarity.compareTwoStrings;
    const job = new Function("item", makeCodeAFunctionBody(code));

    items.forEach((item) => {
      if (!item.value) {
        return;
      }

      let itemFields: {
        [key: string]: string[] | null | undefined;
      } = {};
      Object.keys(item.value).forEach((fieldName) => {
        itemFields[fieldName] = getItemValueAsArray(
          item.value,
          [fieldName],
          "string"
        );
      });

      const itemOutput = job({
        id: item.id,
        itemType: item.item_type,
        fields: JSON.parse(JSON.stringify(itemFields)), // Trick to copy object
      });

      editedFieldsByItemId[item.id] = {};
      Object.keys(itemFields).forEach((fieldName) => {
        if (
          !fieldValueAreEqual(
            itemFields[fieldName],
            itemOutput.fields[fieldName]
          )
        ) {
          editedFieldsByItemId[item.id][fieldName] =
            itemOutput.fields[fieldName];
        }
      });

      if (Object.keys(editedFieldsByItemId[item.id]).length === 0) {
        delete editedFieldsByItemId[item.id];
      }
    });
  } catch (e) {
    throw new Error(
      "Error: Job code seems invalid. Please check it and try again. Details: " +
        e
    );
  }

  return editedFieldsByItemId;
}

function makeCodeAFunctionBody(code: string) {
  const codeByLines = code.split("\n");

  delete codeByLines[0];
  delete codeByLines[codeByLines.length - 1];

  return codeByLines.join("\n");
}

function fieldValueAreEqual(
  a: string[] | null | undefined,
  b: string[] | null | undefined
) {
  if (a === null || a === undefined || b === null || b === undefined) {
    if (a === b) {
      return true;
    } else {
      return false;
    }
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
