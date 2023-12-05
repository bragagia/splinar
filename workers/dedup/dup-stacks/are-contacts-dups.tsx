import {
  CompanySimilarityType,
  CompanyType,
  ContactWithCompaniesAndSimilaritiesType,
  ContactWithCompaniesType,
} from "@/types/database-types";
import { CompanyFieldsType } from "@/workers/dedup/list-company-fields";
import {
  ContactFieldsType,
  listContactField,
} from "@/workers/dedup/list-contact-fields";

const contactScoring = {
  fullname: {
    exact: 30,
    similar: 20,
    potential: 5,
    unlikely: 0,
    notMatching: -70,
    sameCompanyMatchingBonus: 30,
  },
  phone: {
    exact: 20, // phones can be shared like a company, but can also be unique, not sure what to do about them
    similar: 0,
    potential: 0,
    unlikely: 0,
    notMatching: 0,
    sameCompanyMatchingBonus: 0,
  },
  email: {
    exact: 80,
    similar: 60,
    potential: 40,
    unlikely: 0,
    notMatching: -10,
    sameCompanyMatchingBonus: 30,
  },
  company: {
    // This is a multiplier for the "sameCompanyMatchingBonus"
    exact: 1,
    similar: 0.33, // TODO: in the future, when there will be deduplication of companies, this should go to zero because similar companies shouldn't be considered the same at this point
    potential: 0,
    unlikely: 0,
    notMatching: 0,
    sameCompanyMatchingBonus: 0,
  },
};

const ContactFieldsList: ContactFieldsType[] = ["fullname", "email", "phone"];

// TODO: Same company -> Multiply the chance that they are the same, but does not increase score by itself

/*
  Score > 50 -> dup
  Score > 10 -> potential
  Si seulement le nom en pas exact -> Très peu de chabce
  Si seulement l'email en exact -> quasi certain
  Si à la fois le nom et l'email -> Probable
  Nombre de champs remplis qui ne matchent pas : -20 par champ
  Nombre de champs pas remplis : +10 par champ (max of contact pair)
*/

export function areContactsDups(
  contactA: ContactWithCompaniesType,
  contactB: ContactWithCompaniesAndSimilaritiesType
): "CONFIDENT" | "POTENTIAL" | false {
  if (!contactA || !contactB) {
    return false;
  }

  const similaritiesOfContacts = contactB.contact_similarities.filter(
    (similarity) =>
      similarity.contact_a_id === contactA.id ||
      similarity.contact_b_id === contactA.id
  );

  const contactAFields = listContactField(contactA);
  const contactBFields = listContactField(contactB);

  const filledField = Math.min(contactA.filled_score, contactB.filled_score);

  let unmatchingFieldCount = 0;
  let similarityScore = 0;

  // Calc similarity multiplier
  let companySimilarity = similaritiesOfContacts.find(
    (similarity) => similarity.field_type === "company"
  );
  const sameCompanyBonusMultiplier = companySimilarity
    ? contactScoring["company"][companySimilarity.similarity_score]
    : 0;

  ContactFieldsList.forEach((field) => {
    let similarity = similaritiesOfContacts.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      if (
        contactAFields.find((cf) => cf === field) &&
        contactBFields.find((cf) => cf === field)
      ) {
        unmatchingFieldCount++; // TODO: Use notMatchingFieldsScore instead
      }

      return;
    }

    similarityScore +=
      contactScoring[field][similarity.similarity_score] +
      sameCompanyBonusMultiplier *
        contactScoring[field]["sameCompanyMatchingBonus"];
  });

  const missingFieldsMultiplierBonus = (() => {
    switch (filledField) {
      case 1:
        return 2;
      case 2:
        return 1.5;
      case 3:
        return 1.2;
      default:
        return 1;
    }
  })();

  const unmatchingFieldMalus = unmatchingFieldCount * 20; // TODO: missing logic to use score

  const score =
    (similarityScore - unmatchingFieldMalus) * missingFieldsMultiplierBonus;
  if (score >= 70) {
    return "CONFIDENT";
  } else if (score >= 30) {
    return "POTENTIAL";
  } else {
    return false;
  }
}

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
  companyA: CompanyType,
  companyB: CompanyType,
  similaritiesOfCompanies: CompanySimilarityType[]
): "CONFIDENT" | "POTENTIAL" | false {
  if (!companyA || !companyB) {
    return false;
  }

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
