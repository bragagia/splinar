import { getItemType, listItemFields } from "@/lib/items_common";
import { ItemWithSimilaritiesType } from "@/types/items";

export type ValueScoringType = {
  exact?: number;
  similar?: number;
  potential?: number;
  unlikely?: number;

  exactMultiplier?: number;
  similarMultiplier?: number;
  potentialMultiplier?: number;
  unlikelyMultiplier?: number;

  notMatchingMalus?: number;
  notMatchingMalusMultiplier?: number;

  emptyBonus?: number;
  emptyBonusMultiplier?: number;
};

export function areItemsDups(
  itemA: ItemWithSimilaritiesType,
  itemB: ItemWithSimilaritiesType,
  verbose: boolean = false
): "CONFIDENT" | "POTENTIAL" | false {
  if (!itemA || !itemB) {
    return false;
  }

  let scoring: { [key in string]: ValueScoringType };
  let itemType = getItemType(itemA.item_type);
  scoring = itemType.dupScoring;

  const similarities = itemA.similarities.filter(
    (similarity) =>
      similarity.item_a_id === itemB.id || similarity.item_b_id === itemB.id
  );

  const fieldList = Object.keys(scoring) as string[];

  const itemAFields = listItemFields(itemA);
  const itemBFields = listItemFields(itemB);

  let score = 0;
  let multiplier = 1;

  fieldList.forEach((field) => {
    let similarity = similarities.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      if (
        itemAFields.find((cf) => cf === field) &&
        itemBFields.find((cf) => cf === field)
      ) {
        const notMatchingMalus = scoring[field]["notMatchingMalus"];
        score += notMatchingMalus || 0;

        if (verbose && notMatchingMalus !== undefined)
          console.log(`[${field}] not matching - Malus: ${notMatchingMalus}`);

        const notMatchingMalusMultiplier =
          scoring[field]["notMatchingMalusMultiplier"];
        multiplier *= notMatchingMalusMultiplier || 1;

        if (verbose && notMatchingMalusMultiplier !== undefined)
          console.log(
            `[${field}] not matching - Malus multiplier: ${notMatchingMalusMultiplier}`
          );
      } else {
        const emptyBonus = scoring[field]["emptyBonus"];
        score += emptyBonus || 0;

        if (verbose && emptyBonus !== undefined)
          console.log(`[${field}] empty - Bonus: ${emptyBonus}`);

        const emptyBonusMultiplier = scoring[field]["emptyBonusMultiplier"];
        multiplier *= emptyBonusMultiplier || 1;

        if (verbose && emptyBonusMultiplier !== undefined)
          console.log(
            `[${field}] empty - Bonus multiplier: ${emptyBonusMultiplier}`
          );
      }
    } else {
      const similarityBonus = scoring[field][similarity.similarity_score];
      score += similarityBonus || 0;

      if (verbose && similarityBonus !== undefined)
        console.log(
          `[${field}] ${similarity.similarity_score} - Bonus: ${similarityBonus}`
        );

      const similarityBonusMultiplier = (scoring[field] as any)[
        similarity.similarity_score + "Multiplier"
      ];
      multiplier *= similarityBonusMultiplier || 1;

      if (verbose && similarityBonusMultiplier !== undefined)
        console.log(
          `[${field}] ${similarity.similarity_score} - Bonus multiplier: ${similarityBonusMultiplier}`
        );
    }
  });

  const finalScore = score * multiplier;
  if (verbose)
    console.log(`--- finalScore = ${score} * ${multiplier} = ${finalScore}`);

  if (finalScore >= 80) {
    return "CONFIDENT";
  } else if (finalScore >= 35) {
    return "POTENTIAL";
  } else {
    return false;
  }
}
