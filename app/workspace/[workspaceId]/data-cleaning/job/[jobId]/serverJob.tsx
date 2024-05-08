"use server";

import { JobExecutionOutputWithInput } from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/page";
import {
  getItemSourceValueAsString,
  itemFieldValuesAreEqual,
} from "@/lib/items_common";
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
      [key: string]: string | null | undefined;
    };
  } = {};
  let inputFieldsByItemId: {
    [key: string]: {
      [key: string]: string | null | undefined;
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
        [key: string]: string | null | undefined;
      } = {};
      Object.keys(item.value).forEach((fieldName) => {
        itemFields[fieldName] = getItemSourceValueAsString(
          item.value,
          fieldName
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
            !itemFieldValuesAreEqual(
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
          error: "Your code seems invalid. Please check it and try again.",
        },
      },
      inputFieldsByItemId: {
        "1": {
          error: "",
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
