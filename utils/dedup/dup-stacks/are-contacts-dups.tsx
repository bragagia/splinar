import {
  HsContactSimilarityType,
  HsContactWithCompaniesType,
} from "@/utils/database-types";
import {
  ContactFieldsCount,
  ContactFieldsList,
  listContactField,
} from "@/utils/dedup/utils/list-contact-fields";

const scoring = {
  fullname: {
    exact: 30,
    similar: 10,
    potential: 0,
    unlikely: 5,
  },
  phone: {
    exact: 50, // phones can be shared
    similar: 0,
    potential: 0,
    unlikely: 0,
  },
  email: {
    exact: 80,
    similar: 70,
    potential: 30,
    unlikely: 5,
  },
  company: {
    exact: 30,
    similar: 20,
    potential: 5,
    unlikely: 0,
  },
};

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
  contactA: HsContactWithCompaniesType,
  contactB: HsContactWithCompaniesType,
  similaritiesOfContacts: HsContactSimilarityType[]
): "CONFIDENT" | "POTENTIAL" | false {
  if (!contactA || !contactB) {
    return false;
  }

  let contactAFields = listContactField(contactA);
  let contactBFields = listContactField(contactB);

  let missingFieldsBonus =
    5 *
    (ContactFieldsCount -
      Math.min(contactA.filled_score, contactB.filled_score));

  let unmatchingFieldMalus = 0;
  let similarityScore = 0;

  // TODO: average the sum of score so that is is easier to reason about
  ContactFieldsList.forEach((field) => {
    let similarity = similaritiesOfContacts.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      if (
        contactAFields.find((cf) => cf === field) &&
        contactBFields.find((cf) => cf === field)
      ) {
        unmatchingFieldMalus += 20;
      }

      return;
    }

    similarityScore += scoring[field][similarity.similarity_score];
  });

  if (similarityScore + missingFieldsBonus - unmatchingFieldMalus >= 70) {
    return "CONFIDENT";
  } else if (
    similarityScore + missingFieldsBonus - unmatchingFieldMalus >=
    40
  ) {
    return "POTENTIAL";
  } else {
    return false;
  }
}
