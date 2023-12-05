import { CompanyWithSimilaritiesType } from "@/types/database-types";
import { CompanyFieldsType } from "@/workers/dedup/list-company-fields";

/*
 * ALGO
 */

const companyScoring = {
  name: {
    exact: 70,
    similar: 40,
    potential: 30,
    unlikely: 0,
  },
};

const CompanyFieldsList: CompanyFieldsType[] = ["name"];

export function areCompaniesDups(
  companyA: CompanyWithSimilaritiesType,
  companyB: CompanyWithSimilaritiesType
): "CONFIDENT" | "POTENTIAL" | false {
  if (!companyA || !companyB) {
    return false;
  }

  const similaritiesOfCompanies = companyA.company_similarities.filter(
    (similarity) =>
      similarity.company_a_id === companyB.id ||
      similarity.company_b_id === companyB.id
  );

  // const contactAFields = listContactField(companyA);
  // const contactBFields = listContactField(companyB);

  // const filledField = Math.min(companyA.filled_score, companyB.filled_score);

  // let unmatchingFieldCount = 0;
  let similarityScore = 0;

  // Calc similarity multiplier
  // let companySimilarity = similaritiesOfContacts.find(
  //   (similarity) => similarity.field_type === "company"
  // );
  // const sameCompanyBonusMultiplier = companySimilarity
  //   ? scoring["company"][companySimilarity.similarity_score]
  //   : 0;

  CompanyFieldsList.forEach((field) => {
    let similarity = similaritiesOfCompanies.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      // if (
      //   contactAFields.find((cf) => cf === field) &&
      //   contactBFields.find((cf) => cf === field)
      // ) {
      //   unmatchingFieldCount++; // TODO: Use notMatchingFieldsScore instead
      // }

      return;
    }

    similarityScore += companyScoring[field][similarity.similarity_score];
    // + sameCompanyBonusMultiplier * contactScoring[field]["sameCompanyMatchingBonus"];
  });

  // const missingFieldsMultiplierBonus = (() => {
  //   switch (filledField) {
  //     case 1:
  //       return 2;
  //     case 2:
  //       return 1.5;
  //     case 3:
  //       return 1.2;
  //     default:
  //       return 1;
  //   }
  // })();

  //const unmatchingFieldMalus = unmatchingFieldCount * 20; // TODO: missing logic to use score

  const score = similarityScore;
  //(similarityScore - unmatchingFieldMalus) * missingFieldsMultiplierBonus;
  if (score >= 70) {
    return "CONFIDENT";
  } else if (score >= 30) {
    return "POTENTIAL";
  } else {
    return false;
  }
}
