import {
  ItemFieldConfigT,
  getItemType,
  getItemValueAsArray,
  getItemValueAsNameArray,
} from "@/lib/items_common";
import { uuid } from "@/lib/uuid";
import { Tables, TablesInsert } from "@/types/supabase";
import stringSimilarity from "string-similarity";

function cleanStringSpaces(str: string) {
  return str
    .trim()
    .split(/[\s,\t,\n]+/)
    .join(" ");
}

export function evalSimilarities(
  workspaceId: string,
  itemA: Tables<"items">,
  itemB: Tables<"items">
) {
  if (itemA.item_type !== itemB.item_type) {
    throw new Error("Comparing different item types");
  }

  const itemType = getItemType(itemA.item_type);
  const config = itemType.dedupConfig;

  let similarities: TablesInsert<"similarities">[] = [];

  const addSimilarity = (
    field_type: string,
    valueA: string,
    valueB: string,
    similarity_score: TablesInsert<"similarities">["similarity_score"]
  ) => {
    similarities.push({
      id: uuid(),

      workspace_id: workspaceId,
      item_a_id: itemA.id,
      item_b_id: itemB.id,

      field_type: field_type,
      item_a_value: valueA,
      item_b_value: valueB,
      similarity_score: similarity_score,
    });
  };

  config.fields
    .filter((field) => field.ifMatch !== "multiplier")
    .forEach((fieldConfig) => {
      evalSimilarityField(fieldConfig, itemA, itemB, addSimilarity);
    });

  // We evalute multiplier only if there is at least one similarity
  if (similarities.length > 0) {
    config.fields
      .filter((field) => field.ifMatch === "multiplier")
      .forEach((fieldConfig) => {
        evalSimilarityField(fieldConfig, itemA, itemB, addSimilarity);
      });
  }

  // Dedupe similarities
  const scoreRanking: { [key: string]: number } = {
    exact: 4,
    similar: 3,
    potential: 2,
    unlikely: 1,
  };

  let dedupedSimilarities: {
    [key: string]: TablesInsert<"similarities">;
  } = {};

  for (let entry of similarities) {
    if (
      !dedupedSimilarities[entry.field_type] ||
      scoreRanking[entry.similarity_score] >
        scoreRanking[dedupedSimilarities[entry.field_type].similarity_score]
    ) {
      dedupedSimilarities[entry.field_type] = entry;
    }
  }

  return Object.values(dedupedSimilarities);
}

function evalSimilarityField(
  fieldConfig: ItemFieldConfigT,
  itemA: Tables<"items">,
  itemB: Tables<"items">,
  addSimilarity: (
    field_type: string,
    valueA: string,
    valueB: string,
    similarity_score: TablesInsert<"similarities">["similarity_score"]
  ) => void
) {
  if (
    fieldConfig.matchingMethod === "exact" ||
    fieldConfig.matchingMethod === "similar"
  ) {
    const aVal = getItemValueAsArray(
      itemA.value,
      fieldConfig.sources,
      "string"
    ).filter((val) => val.length > 2);

    const bVal = getItemValueAsArray(
      itemB.value,
      fieldConfig.sources,
      "string"
    ).filter((val) => val.length > 2);

    aVal.forEach((a) => {
      bVal.forEach((b) => {
        if (a === b) {
          addSimilarity(fieldConfig.id, a, b, "exact");
        } else if (fieldConfig.matchingMethod === "similar") {
          const compareScore = stringSimilarity.compareTwoStrings(a, b);

          if (compareScore > 0.9) {
            addSimilarity(fieldConfig.id, a, b, "similar");
          } else if (compareScore > 0.85) {
            addSimilarity(fieldConfig.id, a, b, "potential");
          } else if (compareScore > 0.8) {
            addSimilarity(fieldConfig.id, a, b, "unlikely");
          }
        }
      });
    });
  } else if (fieldConfig.matchingMethod === "email") {
    const removeInfiniteAddr = (str: string) => str.replace(/\+[^@]*$/, "");
    const removeUselessDots = (str: string) => str.split(".").join("");
    const removeExt = (str: string) => str.split(".").slice(0, -1).join(".");
    // TODO: use RemoveExt
    const aVal = getItemValueAsArray(itemA.value, fieldConfig.sources, "string")
      .filter((val) => val.length > 4 && val.includes("@"))
      .map((val) => val.trim())
      .map((val) => ({
        full: val,
        id: removeInfiniteAddr(removeUselessDots(val.split("@")[0])),
        domain: val.split("@")[1],
      }));

    const bVal = getItemValueAsArray(itemB.value, fieldConfig.sources, "string")
      .filter((val) => val.length > 4 && val.includes("@"))
      .map((val) => val.trim())
      .map((val) => ({
        full: val,
        id: removeInfiniteAddr(removeUselessDots(val.split("@")[0])),
        domain: val.split("@")[1],
      }));

    aVal.forEach((a) => {
      bVal.forEach((b) => {
        if (a.id === b.id && a.domain === b.domain) {
          addSimilarity(fieldConfig.id, a.full, b.full, "exact");
        } else {
          const idSimScore = stringSimilarity.compareTwoStrings(a.id, b.id);
          const domainSimScore = stringSimilarity.compareTwoStrings(
            a.domain,
            b.domain
          );

          if (idSimScore > 0.95 && domainSimScore > 0.95) {
            addSimilarity(fieldConfig.id, a.full, b.full, "similar");
          } else if (idSimScore > 0.95 && domainSimScore > 0.9) {
            addSimilarity(fieldConfig.id, a.full, b.full, "potential");
          } else if (idSimScore > 0.9) {
            addSimilarity(fieldConfig.id, a.full, b.full, "unlikely");
          }
        }
      });
    });
  } else if (fieldConfig.matchingMethod === "name") {
    const aVal = getItemValueAsNameArray(itemA.value, fieldConfig.sources).map(
      (val) => (val ? cleanStringSpaces(val).toLowerCase() : null)
    );

    const bVal = getItemValueAsNameArray(itemB.value, fieldConfig.sources).map(
      (val) => (val ? cleanStringSpaces(val).toLowerCase() : null)
    );

    const aFullName = cleanStringSpaces(aVal.join(" "));
    const aStrictFullName = cleanStringSpaces(
      aVal.map((part, i) => (bVal[i] ? part : null)).join(" ")
    );

    const bFullName = cleanStringSpaces(bVal.join(" "));
    const bStrictFullName = cleanStringSpaces(
      bVal.map((part, i) => (aVal[i] ? part : null)).join(" ")
    );

    const compareScore = stringSimilarity.compareTwoStrings(
      aFullName,
      bFullName
    );

    const strictCompareScore =
      aStrictFullName.length > 1 && bStrictFullName.length > 1
        ? stringSimilarity.compareTwoStrings(aStrictFullName, bStrictFullName)
        : 0;
    // TODO: Use better algo Jaro-Winkler -> https://www.npmjs.com/package/string-comparison
    if (
      aFullName &&
      bFullName &&
      aFullName.length > 2 &&
      bFullName.length > 2
    ) {
      if (aFullName == bFullName) {
        addSimilarity(fieldConfig.id, aFullName, bFullName, "exact");
      } else {
        if (compareScore > 0.9) {
          addSimilarity(fieldConfig.id, aFullName, bFullName, "similar");
        } else if (compareScore > 0.8 || strictCompareScore > 0.9) {
          addSimilarity(fieldConfig.id, aFullName, bFullName, "potential");
        } else if (compareScore > 0.7 || strictCompareScore > 0.8) {
          addSimilarity(fieldConfig.id, aFullName, bFullName, "unlikely");
        }
      }
    }
  } else if (fieldConfig.matchingMethod === "url") {
    const aVal = getItemValueAsArray(itemA.value, fieldConfig.sources, "string")
      .filter((val) => val.length > 2)
      .map((val) => extractCleanURLandID(val));

    const bVal = getItemValueAsArray(itemB.value, fieldConfig.sources, "string")
      .filter((val) => val.length > 2)
      .map((val) => extractCleanURLandID(val));

    aVal.forEach((a) => {
      bVal.forEach((b) => {
        if (
          a.id &&
          b.id &&
          a.id === b.id &&
          !(a.cleanURL.includes("/") && b.cleanURL.includes("/"))
        ) {
          // If there is ids and one or both of the urls is not full url, and ids are equal (eg: http://linkedin.com/mathias = mathias)
          addSimilarity(fieldConfig.id, a.id, b.id, "exact");
        } else if (a.cleanURL === b.cleanURL) {
          addSimilarity(fieldConfig.id, a.cleanURL, b.cleanURL, "exact");
        }
      });
    });
  }
}

function extractCleanURLandID(url: string): {
  cleanURL: string;
  id: string | null;
} {
  // Remove protocol and "www"
  const cleanURL = url.replace(/^(?:https?:\/\/)?(?:www\.)?/, "").toLowerCase();

  // Extract domain and last segment (ID)
  const parts = cleanURL.split("/");
  if (parts.length === 0) {
    return { cleanURL, id: cleanURL };
  }

  const id = parts[parts.length - 1];

  return { cleanURL, id };
}
