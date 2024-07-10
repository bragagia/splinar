import { getItemTypeConfig, listItemFields } from "@/lib/items_common";
import { ItemWithSimilaritiesType } from "@/types/items";
import { Tables } from "@/types/supabase";

const simScoreFactorMap: { [key: string]: number } = {
  exact: 1,
  similar: 0.75,
  potential: 0.4,
  unlikely: 0,
};

export function areItemsDups(
  workspace: Tables<"workspaces">,
  itemA: ItemWithSimilaritiesType,
  itemB: ItemWithSimilaritiesType,
  log: (message?: any, ...optionalParams: any[]) => void = (...any) => {}
): "CONFIDENT" | "POTENTIAL" | false {
  if (!itemA || !itemB) {
    return false;
  }

  if (itemA.item_type !== itemB.item_type) {
    throw new Error("Comparing different item types");
  }

  const itemType = getItemTypeConfig(workspace, itemA.item_type);
  const config = itemType.dedupConfig;

  let confidentScore = 0;
  let potentialScore = 0;
  let multiplier = 1;
  let confidentMalus = 0;
  let potentialMalus = 0;

  const similarities = itemA.similarities.filter(
    (similarity) =>
      similarity.item_a_id === itemB.id || similarity.item_b_id === itemB.id
  );

  const itemAFields = listItemFields(workspace, itemA);
  const itemBFields = listItemFields(workspace, itemB);

  if (itemAFields.length === 1 || itemBFields.length === 1) {
    multiplier *= 1.35; // To allow similar to match as potential
  }

  config.fields.forEach((field) => {
    let similarity = similarities.find(
      (similarity) => similarity.field_type === field.id
    );

    if (similarity) {
      const simScoreFactor = simScoreFactorMap[similarity.similarity_score];

      // Fields are similar
      if (field.ifMatch === "confident") {
        confidentScore += simScoreFactor === 1 ? 1 : 0;
        potentialScore += 2 * simScoreFactor;
        log(
          `# ${field.displayName} -> matched / confident (simScoreFactor: ${simScoreFactor})`
        );
      } else if (field.ifMatch === "potential") {
        potentialScore += 1 * simScoreFactor;
        log(
          `# ${field.displayName} -> matched / potential (simScoreFactor: ${simScoreFactor})`
        );
      } else if (field.ifMatch === "multiplier") {
        multiplier *= 1 + 0.5 * simScoreFactor;
        log(`# ${field.displayName} -> matched / multiplier`);
      } else {
        log(`# ${field.displayName} -> matched / N/A`);
      }
    } else {
      const bothItemHaveField =
        itemAFields.find((itemFielf) => itemFielf === field.id) &&
        itemBFields.find((itemFielf) => itemFielf === field.id);

      // = Fields are differents
      if (bothItemHaveField) {
        if (field.ifDifferent === "prevent-match") {
          confidentMalus += -1000;
          potentialMalus += -1000;
          log(`# ${field.displayName} -> different / prevent-match`);
        } else if (field.ifDifferent === "prevent-confident-reduce-potential") {
          confidentMalus += -1000;
          potentialMalus += -2;
          log(
            `# ${field.displayName} -> different / prevent-confident-reduce-potential`
          );
        } else if (field.ifDifferent === "reduce-confident-reduce-potential") {
          confidentMalus += -1;
          potentialMalus += -1;
          log(
            `# ${field.displayName} -> different / reduce-confident-reduce-potential`
          );
        } else if (field.ifDifferent === "prevent-confident") {
          confidentMalus += -1000;
          log(`# ${field.displayName} -> different / prevent-confident`);
        } else if (field.ifDifferent === "reduce-confident") {
          confidentMalus += -1;
          log(`# ${field.displayName} -> different / reduce-confident`);
        } else if (field.ifDifferent === "reduce-potential") {
          potentialMalus += -1;
          log(`# ${field.displayName} -> different / reduce-potential`);
        } else {
          log(`# ${field.displayName} -> different / N/A`);
        }
      } else {
        log(`# ${field.displayName} -> incomplete-data`);
      }
    }
  });

  log(`---`);
  log(`confident score -> ${confidentScore}`);
  log(`potential score -> ${potentialScore}`);
  log(`multiplier score -> ${multiplier}`);
  log(`confident malus -> ${confidentMalus}`);
  log(`potential malus -> ${potentialMalus}`);

  const finalConfidentScore = confidentScore * multiplier + confidentMalus;
  const finalPotentialScore = potentialScore * multiplier + potentialMalus;
  log(`---> Final scores : [${finalConfidentScore}, ${finalPotentialScore}]`);

  if (finalConfidentScore > 0) {
    return "CONFIDENT";
  } else if (finalPotentialScore > 0.4) {
    return "POTENTIAL";
  } else {
    return false;
  }
}
