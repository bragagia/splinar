import {
  bulkUpdateItems,
  getItemSourceValueAsString,
  getItemTypeConfig,
  itemFieldValuesAreEqual,
} from "@/lib/items_common";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import stringSimilarity from "string-similarity";

const ALLOWED_DURATION_PER_ITEM_MS = 40;
const ALLOWED_DURATION_OFFSET_MS = 200;

export async function runDataCleaningJobOnBatch(
  supabaseAdmin: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  jobValidated: Tables<"data_cleaning_job_validated">,
  items: Tables<"items">[]
) {
  // Keep only items targeted by job
  const filteredItems = items.filter(
    (item) => item.item_type === jobValidated.target_item_type
  );

  console.log(
    "### runDataCleaningJobOnBatch",
    jobValidated.id,
    "on",
    filteredItems.length,
    "items"
  );

  if (filteredItems.length === 0) {
    return;
  }

  const itemConfig = getItemTypeConfig(jobValidated.target_item_type);

  // Set job as errored (so that event if it timeout of crash, it will be errored correclty)
  const { error: errorJobUpdate } = await supabaseAdmin
    .from("data_cleaning_job_validated")
    .update({
      errored_timeout_or_fatal: true,
    })
    .eq("id", jobValidated.id);
  if (errorJobUpdate) {
    throw errorJobUpdate;
  }

  try {
    const jobFunction = getJobFunction(jobValidated.code);

    const jobOutput = runCodeJobOnItems(filteredItems, jobFunction);

    await createJobLogs(
      supabaseAdmin,
      workspace.id,
      jobValidated,
      jobOutput,
      jobValidated.auto_accept_changes
    );

    if (jobValidated.auto_accept_changes) {
      await itemConfig.distantUpdateBulk(workspace, jobOutput);

      await bulkUpdateItems(
        supabaseAdmin,
        workspace,
        jobValidated.target_item_type,
        jobOutput
      );
    }

    // If we came here, it means the job was successful, remove the errored flag
    const { error: errorJobUpdate } = await supabaseAdmin
      .from("data_cleaning_job_validated")
      .update({
        errored_timeout_or_fatal: false,
      })
      .eq("id", jobValidated.id);
    if (errorJobUpdate) {
      throw errorJobUpdate;
    }
  } catch (e: any) {
    await supabaseAdmin
      .from("data_cleaning_job_validated")
      .update({
        errored_timeout_or_fatal: false,
        errored_message: e.message,
      })
      .eq("id", jobValidated.id);

    throw e;
  }
}

async function createJobLogs(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  jobValidated: Tables<"data_cleaning_job_validated">,
  jobOutput: JobOutputByItemId,
  autoAcceptChanges: boolean
) {
  const acceptedAt = autoAcceptChanges ? dayjs().toISOString() : null;

  let jobLogs = Object.keys(jobOutput).map((itemId) => {
    const log: TablesInsert<"data_cleaning_job_logs"> = {
      workspace_id: workspaceId,
      data_cleaning_job_id: jobValidated.data_cleaning_job_id,
      data_cleaning_job_validated_id: jobValidated.id,
      item_id: itemId,
      item_type: jobValidated.target_item_type,
      prev_value: jobOutput[itemId].Prev,
      new_value: jobOutput[itemId].Next,
      accepted_at: acceptedAt,
    };

    return log;
  });

  const { error } = await supabaseAdmin
    .from("data_cleaning_job_logs")
    .upsert(jobLogs, {
      onConflict: "workspace_id,data_cleaning_job_id,item_id",
    });

  if (error) {
    throw error;
  }
}

declare global {
  var stringSimScore: (s1: string, s2: string) => number;
}

export type JobOutputByItemId = {
  [key: string]: {
    id: string;
    distantId: string;
    Prev: {
      [key: string]: string | null | undefined;
    };

    Next: {
      [key: string]: string | null | undefined;
    };
  };
};

const sucrase = require("sucrase");

export function getJobFunction(code: string) {
  global.stringSimScore = stringSimilarity.compareTwoStrings;

  const codeWithReturn = code + "\nreturn customJob(_itemInternal);";

  const transpiledResult = sucrase.transform(codeWithReturn, {
    transforms: ["typescript"],
  }).code;

  return new Function("_itemInternal", transpiledResult);
}

// runCodeJobOnItems take a set of items as input and return the same set of items with the fields modified by the job
function runCodeJobOnItems(
  items: Tables<"items">[],
  jobFunction: Function
): JobOutputByItemId {
  const maxTotalDuration =
    ALLOWED_DURATION_OFFSET_MS + items.length * ALLOWED_DURATION_PER_ITEM_MS;
  const start = performance.now();

  let jobOutput: JobOutputByItemId = {};

  let doneCount = 0;
  for (const item of items) {
    if (!item.value) {
      continue;
    }

    try {
      let itemFields: {
        [key: string]: string | null | undefined;
      } = {};
      Object.keys(item.value).forEach((fieldName) => {
        itemFields[fieldName] = getItemSourceValueAsString(
          item.value,
          fieldName
        );
      });

      const itemInput = {
        id: item.id,
        itemType: item.item_type,
        fields: itemFields,
      };

      const itemOutput = jobFunction(JSON.parse(JSON.stringify(itemInput))); // Trick to deep copy object

      jobOutput[item.id] = {
        id: item.id,
        distantId: item.distant_id,
        Prev: {},
        Next: {},
      };
      Object.keys(itemOutput.fields).forEach((fieldName) => {
        const safeFieldOutput = safeStringify(itemOutput.fields[fieldName]);

        if (
          !itemFieldValuesAreEqual(itemInput.fields[fieldName], safeFieldOutput)
        ) {
          jobOutput[item.id].Prev[fieldName] = itemInput.fields[fieldName];
          jobOutput[item.id].Next[fieldName] = safeFieldOutput;
        }
      });

      if (Object.keys(jobOutput[item.id].Next).length === 0) {
        delete jobOutput[item.id];
      }
    } catch (e) {
      throw new Error(
        "Error: Job code seems invalid. Please check it and try again. Details: " +
          e
      );
    }

    doneCount++;

    if (performance.now() - start > maxTotalDuration) {
      const averageDuration = (performance.now() - start) / doneCount;
      throw new Error(
        `Error: Job timeouted afrer ${doneCount} items. Average job exec duration was ${averageDuration}ms but max is ${ALLOWED_DURATION_PER_ITEM_MS}ms per item.`
      );
    }
  }

  return jobOutput;
}

function safeStringify(value: any) {
  // Handle null and undefined explicitly
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;

  throw new Error("Invalid value");
}
