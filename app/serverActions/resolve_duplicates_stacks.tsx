import {
  ContactType,
  Similarity,
} from "@/app/serverActions/contacts_similarity_check";

// field_type: "fullname" | "phone" | "email" | "company";
// contact_a_value: string;
// contact_b_value: string;
// similarity_score: "exact" | "similar" | "potential" | "unlikely";

/*
  Score > 50 -> dup
  Score > 10 -> potential
  Si seulement le nom en pas exact -> Très peu de chabce
  Si seulement l'email en exact -> quasi certain
  Si à la fois le nom et l'email -> Probable
  Nombre de champs remplis qui ne matchent pas : -20 par champ
  Nombre de champs pas remplis : +10 par champ (max of contact pair)
*/

const scoring = {
  fullname: {
    exact: 40,
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
};

type ContactFieldsType = "fullname" | "email" | "phone";
const ContactFieldsCount = 3;
const ContactFieldsList: ContactFieldsType[] = ["fullname", "email", "phone"];

function listContactField(contact: ContactType) {
  let fields: ContactFieldsType[] = [];

  let fullname = (contact.first_name || "") + (contact.last_name || "");
  if (fullname.trim().length > 0) {
    fields.push("fullname");
  }

  if (contact.emails && contact.emails.length > 0) {
    fields.push("email");
  }

  if (contact.phones && contact.phones.length > 0) {
    fields.push("phone");
  }

  return fields;
}

function areContactsDups(
  contactA: ContactType,
  contactB: ContactType,
  similaritiesOfContacts: Similarity[]
): "CONFIDENT" | "POTENTIAL" | false {
  if (!contactA || !contactB) {
    return false;
  }

  let contactAFields = listContactField(contactA);
  let contactBFields = listContactField(contactB);

  let missingFieldsBonus =
    10 *
    (ContactFieldsCount -
      Math.min(contactAFields.length, contactBFields.length));

  let unmatchingFieldMalus = 0;
  let similarityScore = 0;
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
    50
  ) {
    return "POTENTIAL";
  } else {
    return false;
  }
}

export type ContactDuplicatesType = {
  confidents: string[];
  potentials: string[];
};

export function resolveDuplicatesStacks(
  contacts: ContactType[],
  similarities: Similarity[]
) {
  let contactsById: {
    [key: string]: ContactType;
  } = {};
  contacts.forEach((contact) => (contactsById[contact.id] = contact));

  // TODO: sort contacts by how well they are filled, so that the first contact will always be the best filled

  let dupStacks: ContactDuplicatesType[] = [];
  contacts.forEach((contact) => {
    // We recursively check if this contacts or its supposed duplicates have other duplicates to create
    // a "stack" of duplicates. Any contact added to the stack is removed from the checklist to never
    // be added to another stack
    let dupStack: ContactDuplicatesType = {
      confidents: [contact.id],
      potentials: [],
    };

    function addChildsToStack(
      parentContactId: string,
      isChildOfPotentialDup: boolean
    ) {
      let parentContact = contactsById[parentContactId];
      if (!parentContact) {
        return;
      }
      delete contactsById[parentContactId];

      let parentContactSimilarities = similarities.filter(
        (similarity) =>
          similarity.contact_a_id === parentContactId ||
          similarity.contact_b_id === parentContactId
      );
      if (parentContactSimilarities.length === 0) {
        return;
      }

      let parentContactSimilaritiesByContact: { [key: string]: Similarity[] } =
        {};
      parentContactSimilarities.forEach((similarity) => {
        let childContactId =
          similarity.contact_a_id === parentContactId
            ? similarity.contact_b_id
            : similarity.contact_a_id;

        (parentContactSimilaritiesByContact[childContactId] ??= []).push(
          similarity
        );
      });

      let parentContactNewDuplicates: ContactDuplicatesType = {
        confidents: [],
        potentials: [],
      };
      Object.keys(parentContactSimilaritiesByContact).forEach(
        (childContactId) => {
          // Not already in dupstack
          if (
            !dupStack.confidents.find((id) => childContactId === id) &&
            !dupStack.potentials.find((id) => childContactId === id)
          ) {
            let dupStatus = areContactsDups(
              parentContact,
              contactsById[childContactId],
              parentContactSimilaritiesByContact[childContactId]
            );

            if (dupStatus === "CONFIDENT" && !isChildOfPotentialDup) {
              parentContactNewDuplicates.confidents.push(childContactId);
            } else if (dupStatus) {
              // Even if the dup is confident, if we decent from a potential dup, we only add it as a potential too
              parentContactNewDuplicates.potentials.push(childContactId);
            }
          }
        }
      );

      // We push all childs before calling recursive to prevent going into a deep and expensive call stack
      parentContactNewDuplicates.confidents.forEach((id) => {
        dupStack.confidents.push(id);
      });
      parentContactNewDuplicates.potentials.forEach((id) => {
        dupStack.potentials.push(id);
      });
      parentContactNewDuplicates.confidents.forEach((id) => {
        addChildsToStack(id, false);
      });
      parentContactNewDuplicates.potentials.forEach((id) => {
        addChildsToStack(id, true);
      });
    }

    addChildsToStack(contact.id, false);

    if (dupStack.confidents.length > 1 || dupStack.potentials.length > 0) {
      dupStacks.push(dupStack);
    }
  });

  return dupStacks;
}
