import { areContactsDups } from "@/utils/are-contacts-dups";
import {
  ContactDuplicatesType,
  HsContactSimilarityType,
  HsContactType,
} from "@/utils/database-types";
import { listContactField } from "@/utils/list_contact_fields";

export function resolveDuplicatesStacks(
  contacts: HsContactType[],
  similarities: HsContactSimilarityType[]
) {
  let contactsById: {
    [key: string]: HsContactType;
  } = {};
  contacts.forEach((contact) => (contactsById[contact.id] = contact));

  // We sort contacts by how well they are filled, so that the first contact will always be the best filled
  let sortedContacts = contacts.sort(
    (a, b) => listContactField(b).length - listContactField(a).length
  );

  let dupStacks: ContactDuplicatesType[] = [];
  sortedContacts.forEach((contact) => {
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

      let parentContactSimilaritiesByContact: {
        [key: string]: HsContactSimilarityType[];
      } = {};
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
