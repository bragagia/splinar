import { uuid } from "@/lib/uuid";
import {
  ContactSimilarityType,
  ContactWithCompaniesType,
  DupStackType,
} from "@/types/database-types";
import { areContactsDups } from "@/utils/dedup/dup-stacks/are-contacts-dups";
import { listContactField } from "@/utils/dedup/list-contact-fields";

export function resolveDuplicatesStacks(
  contacts: ContactWithCompaniesType[],
  similarities: ContactSimilarityType[],
  workspaceId: string
) {
  let contactsById: {
    [key: string]: ContactWithCompaniesType;
  } = {};
  contacts.forEach((contact) => (contactsById[contact.id] = contact));

  // We sort contacts by how well they are filled, so that the first contact will always be the best filled
  let sortedContacts = contacts.sort(
    (a, b) => listContactField(b).length - listContactField(a).length
  );

  let dupStacks: DupStackType[] = [];
  sortedContacts.forEach((contact) => {
    // We recursively check if this contacts or its supposed duplicates have other duplicates to create
    // a "stack" of duplicates. Any contact added to the stack is removed from the checklist to never
    // be added to another stack
    let dupStack: DupStackType = {
      id: uuid(),
      workspace_id: workspaceId,
      confident_contact_ids: [contact.id],
      potential_contact_ids: [],
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
        [key: string]: ContactSimilarityType[];
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

      let parentContactNewDuplicates = {
        confident_contact_ids: [] as string[],
        potential_contact_ids: [] as string[],
      };
      Object.keys(parentContactSimilaritiesByContact).forEach(
        (childContactId) => {
          // Not already in dupstack
          if (
            !dupStack.confident_contact_ids.find(
              (id) => childContactId === id
            ) &&
            !dupStack.potential_contact_ids?.find((id) => childContactId === id)
          ) {
            let dupStatus = areContactsDups(
              parentContact,
              contactsById[childContactId],
              parentContactSimilaritiesByContact[childContactId]
            );

            if (dupStatus === "CONFIDENT" && !isChildOfPotentialDup) {
              parentContactNewDuplicates.confident_contact_ids.push(
                childContactId
              );
            } else if (dupStatus) {
              // Even if the dup is confident, if we descent from a potential dup, we only add it as a potential too
              parentContactNewDuplicates.potential_contact_ids.push(
                childContactId
              );
            }
          }
        }
      );

      // We push all childs before calling recursive to prevent going into a deep and expensive call stack
      parentContactNewDuplicates.confident_contact_ids.forEach((id) => {
        dupStack.confident_contact_ids.push(id);
      });
      parentContactNewDuplicates.potential_contact_ids.forEach((id) => {
        dupStack.potential_contact_ids?.push(id);
      });
      parentContactNewDuplicates.confident_contact_ids.forEach((id) => {
        addChildsToStack(id, false);
      });
      parentContactNewDuplicates.potential_contact_ids.forEach((id) => {
        addChildsToStack(id, true);
      });
    }

    addChildsToStack(contact.id, false);

    if (
      dupStack.confident_contact_ids.length > 1 ||
      (dupStack.potential_contact_ids &&
        dupStack.potential_contact_ids.length > 0)
    ) {
      dupStacks.push(dupStack);
    }
  });

  return dupStacks;
}
