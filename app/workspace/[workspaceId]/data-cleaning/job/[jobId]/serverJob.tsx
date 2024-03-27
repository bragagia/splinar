"use server";

import { JobExecutionOutputWithInput } from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/page";
import { getItemValueAsArray } from "@/lib/items_common";
import { Tables } from "@/types/supabase";
import stringSimilarity from "string-similarity";

declare global {
  var stringSimScore: (s1: string, s2: string) => number;
}

export async function customJobExecutorSA(
  items: Tables<"items">[],
  code: string
): Promise<JobExecutionOutputWithInput> {
  let outputFieldsNames: string[] = [];
  let outputFieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  } = {};
  let inputFieldsByItemId: {
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
        fields: JSON.parse(JSON.stringify(itemFields)),
      });

      const thisOutputFieldsNames = Object.keys(itemOutput.fields);
      thisOutputFieldsNames.forEach((fieldName) => {
        if (outputFieldsNames.indexOf(fieldName) === -1) {
          if (
            !fieldValueAreEqual(
              itemFields[fieldName],
              itemOutput.fields[fieldName]
            )
          ) {
            outputFieldsNames.push(fieldName);
          }
        }
      });

      outputFieldsByItemId[item.id] = itemOutput.fields;
      inputFieldsByItemId[item.id] = itemFields;
    });
  } catch (e) {
    return {
      fieldsName: ["error"],
      outputFieldsByItemId: {
        "1": {
          error: ["Your code seems invalid. Please check it and try again."],
        },
      },
      inputFieldsByItemId: {
        "1": {
          error: [""],
        },
      },
    };
  }

  return {
    fieldsName: outputFieldsNames,
    outputFieldsByItemId: outputFieldsByItemId,
    inputFieldsByItemId: inputFieldsByItemId,
  };
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
