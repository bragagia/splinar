import {
  JobOutputByItemId,
  getItemSourceValueAsString,
  itemFieldValuesAreEqual,
} from "@/lib/items_common";
import { Tables } from "@/types/supabase";
import stringSimilarity from "string-similarity";

const ALLOWED_DURATION_PER_ITEM_MS = 40;
const ALLOWED_DURATION_OFFSET_MS = 200;

declare global {
  var stringSimScore: (s1: string, s2: string) => number;
}

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
export function runCodeJobOnItems(
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
