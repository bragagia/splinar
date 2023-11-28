import { uuid } from "@/lib/uuid";
import {
  ContactSimilarityType,
  ContactWithCompaniesAndRawSimilaritiesType,
  ContactWithCompaniesAndSimilaritiesType,
  DupStackForInsertType,
  SUPABASE_FILTER_MAX_SIZE,
  isAContactWithCompaniesAndSimilaritiesType,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { areContactsDups } from "@/workers/dedup/dup-stacks/are-contacts-dups";
import { SupabaseClient } from "@supabase/supabase-js";

export async function resolveNextDuplicatesStack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsCacheById: {
    [key: string]: ContactWithCompaniesAndSimilaritiesType;
  },
  specificContact?: ContactWithCompaniesAndSimilaritiesType
): Promise<boolean> {
  let referenceContact: ContactWithCompaniesAndSimilaritiesType;

  if (specificContact) {
    referenceContact = specificContact;
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .select(
        `*,
        companies(*),
        similarities_a:contact_similarities!contact_similarities_contact_a_id_fkey(*), similarities_b:contact_similarities!contact_similarities_contact_b_id_fkey(*)`
      )
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .eq("dup_checked", false)
      .order("filled_score", { ascending: false })
      .limit(1);
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      return false;
    }

    const { similarities_a, similarities_b, ...contact } = {
      ...data[0],
      contact_similarities: data[0].similarities_a.concat(
        data[0].similarities_b
      ) as ContactSimilarityType[],
    };

    referenceContact = contact;
    contactsCacheById[contact.id] = contact;
  }

  // We recursively check if this contacts or its supposed duplicates have other duplicates to create
  // a "stack" of duplicates. Any contact added to the stack is removed from the checklist to never
  // be added to another stack

  let dupStack: DupStackForInsertType = {
    id: uuid(),
    workspace_id: workspaceId,
    confident_contact_ids: [referenceContact.id],
    potential_contact_ids: [],
  };

  async function addChildsToStack(
    parentContactId: string,
    isChildOfPotentialDup: boolean
  ) {
    let { parentContact, similarContacts } =
      await fetchSimilarContactsSortedByFillScore(
        supabase,
        workspaceId,
        contactsCacheById,
        parentContactId
      );
    if (similarContacts.length === 0) {
      return;
    }

    let parentContactNewDuplicates = {
      confident_contact_ids: [] as string[],
      potential_contact_ids: [] as string[],
    };

    similarContacts.forEach((similarContact) => {
      const isInDupstack =
        dupStack.confident_contact_ids.find((id) => similarContact.id === id) ||
        dupStack.potential_contact_ids.find((id) => similarContact.id === id);

      if (isInDupstack) {
        return;
      }

      let dupStatus = areContactsDups(
        parentContact,
        similarContact,
        similarContact.contact_similarities.filter(
          (similarity) =>
            similarity.contact_a_id === parentContact.id ||
            similarity.contact_b_id === parentContact.id
        )
      );

      if (dupStatus) {
        const isMoreFilledThanReference =
          similarContact.filled_score > referenceContact.filled_score;

        if (isMoreFilledThanReference) {
          // Restart the whole function with similarContact as reference, because it has more data
          throw similarContact;
        }
      }

      if (dupStatus === "CONFIDENT" && !isChildOfPotentialDup) {
        parentContactNewDuplicates.confident_contact_ids.push(
          similarContact.id
        );
      } else if (dupStatus) {
        // Even if the dup is confident, if we descent from a potential dup, we only add it as a potential too
        parentContactNewDuplicates.potential_contact_ids.push(
          similarContact.id
        );
      }
    });

    // We push all childs before calling recursive to prevent going into a deep and expensive call stack
    parentContactNewDuplicates.confident_contact_ids.forEach((id) => {
      dupStack.confident_contact_ids.push(id);
    });
    parentContactNewDuplicates.potential_contact_ids.forEach((id) => {
      dupStack.potential_contact_ids.push(id);
    });
    await Promise.all(
      parentContactNewDuplicates.confident_contact_ids.map(async (id) => {
        await addChildsToStack(id, false);
      })
    );
    await Promise.all(
      parentContactNewDuplicates.potential_contact_ids.map(async (id) => {
        await addChildsToStack(id, true);
      })
    );
  }

  try {
    await addChildsToStack(referenceContact.id, false);
  } catch (newReferenceContact) {
    if (isAContactWithCompaniesAndSimilaritiesType(newReferenceContact)) {
      return await resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        contactsCacheById,
        newReferenceContact
      );
    } else {
      throw newReferenceContact;
    }
  }

  // dupStack empty == only the reference element
  const dupStackIsEmpty =
    dupStack.confident_contact_ids.length <= 1 &&
    dupStack.potential_contact_ids.length == 0;

  const allDupsId = [
    ...dupStack.confident_contact_ids,
    ...dupStack.potential_contact_ids,
  ];

  if (!dupStackIsEmpty) {
    // TODO: Make this work for updates
    // await deleteExistingDupstacksAndMarkUnchecked(
    //   supabase,
    //   workspaceId,
    //   contactsById,
    //   allDupsId
    // );

    await createDupstack(supabase, dupStack);
  }

  // Mark dupstack elements as dup_checked, at least the contact that was analysed
  await markDupstackElementsAsDupChecked(supabase, workspaceId, allDupsId);

  return true;
}

async function createDupstack(
  supabase: SupabaseClient<Database>,
  dupstackForInsert: DupStackForInsertType
) {
  const dupstack: Database["public"]["Tables"]["dup_stacks"]["Insert"] = {
    id: dupstackForInsert.id,
    workspace_id: dupstackForInsert.workspace_id,
  };

  const dupstackContacts: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"][] =
    [];

  dupstackContacts.push(
    ...dupstackForInsert.confident_contact_ids.map((id, i) => {
      const ret: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"] =
        {
          contact_id: id,
          dup_type: i === 0 ? "REFERENCE" : "CONFIDENT",
          dupstack_id: dupstackForInsert.id,
          workspace_id: dupstackForInsert.workspace_id,
        };
      return ret;
    })
  );

  dupstackContacts.push(
    ...dupstackForInsert.potential_contact_ids.map((id, i) => {
      const ret: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"] =
        {
          contact_id: id,
          dup_type: "POTENTIAL",
          dupstack_id: dupstackForInsert.id,
          workspace_id: dupstackForInsert.workspace_id,
        };
      return ret;
    })
  );

  const { error: errorDupstack } = await supabase
    .from("dup_stacks")
    .insert(dupstack);
  if (errorDupstack) {
    throw errorDupstack;
  }

  const { error: errorDupstackContact } = await supabase
    .from("dup_stack_contacts")
    .insert(dupstackContacts);
  if (errorDupstackContact) {
    throw errorDupstackContact;
  }
}

async function markDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackIds: string[]
) {
  const { error: errorChecked } = await supabase
    .from("contacts")
    .update({ dup_checked: true })
    .in("id", dupstackIds)
    .eq("workspace_id", workspaceId);
  if (errorChecked) {
    throw errorChecked;
  }
}

async function fetchSimilarContactsSortedByFillScore(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsCacheById: {
    [key: string]: ContactWithCompaniesAndSimilaritiesType;
  },
  parentContactId: string
) {
  const parentContact = contactsCacheById[parentContactId];

  let res = {
    parentContact: contactsCacheById[parentContactId],
    similarContacts: [] as ContactWithCompaniesAndSimilaritiesType[],
  };

  const similarContactsIds = parentContact.contact_similarities.reduce(
    (acc, item) => {
      const similarID =
        item.contact_a_id === parentContactId
          ? item.contact_b_id
          : item.contact_a_id;

      if (acc.find((v) => v === similarID)) {
        return acc;
      }

      acc.push(similarID);
      return acc;
    },
    [] as string[]
  );

  let similarContactsIdsToFetch: string[] = [];

  similarContactsIds.forEach((id, i) => {
    const cachedContact = contactsCacheById[id];

    if (cachedContact) {
      res.similarContacts.push(cachedContact);
    } else {
      similarContactsIdsToFetch.push(id);
    }
  });

  if (similarContactsIdsToFetch.length > 0) {
    let fetchedContactsRaw: ContactWithCompaniesAndRawSimilaritiesType[] = [];

    for (
      let i = 0;
      i < similarContactsIdsToFetch.length;
      i += SUPABASE_FILTER_MAX_SIZE
    ) {
      const { data, error } = await supabase
        .from("contacts")
        .select(
          `*,
          companies(*),
          similarities_a:contact_similarities!contact_similarities_contact_a_id_fkey(*), similarities_b:contact_similarities!contact_similarities_contact_b_id_fkey(*)`
        )
        .eq("workspace_id", workspaceId)
        .in(
          "id",
          similarContactsIdsToFetch.slice(i, i + SUPABASE_FILTER_MAX_SIZE)
        );
      if (error) {
        throw error;
      }

      fetchedContactsRaw.push(...data);
    }

    const fetchedContacts = fetchedContactsRaw.map((raw_contact) => {
      const { similarities_a, similarities_b, ...contact } = {
        ...raw_contact,
        contact_similarities: raw_contact.similarities_a.concat(
          raw_contact.similarities_b
        ) as ContactSimilarityType[],
      };

      return contact;
    });

    fetchedContacts.forEach((contact) => {
      res.similarContacts.push(contact);
      contactsCacheById[contact.id] = contact;
    });
  }

  res.similarContacts.sort((a, b) => b.filled_score - a.filled_score);

  return res;
}

// async function deleteExistingDupstacksAndMarkUnchecked(
//   supabase: SupabaseClient<Database>,
//   workspaceId: string,
//   contactsById: {
//     [key: string]: ContactWithCompaniesAndSimilaritiesType;
//   },
//   contactIds: string[]
// ) {
//   let ors = [] as string[];
//   contactIds.forEach((contactId) => {
//     ors.push('confident_contact_ids.cs.{"' + contactId + '"}');
//     ors.push('potential_contact_ids.cs.{"' + contactId + '"}');
//   });

//   const { data: existingDupStacks, error } = await supabase
//     .from("dup_stacks")
//     .select()
//     .eq("workspace_id", workspaceId)
//     .or(ors.join(","));
//   if (error) {
//     throw error;
//   }

//   if (!existingDupStacks || existingDupStacks.length === 0) {
//     return;
//   }

//   const contactToMarkUnchecked = existingDupStacks
//     .reduce((acc, dupstack) => {
//       acc.push(...dupstack.confident_contact_ids);

//       if (dupstack.potential_contact_ids) {
//         acc.push(...dupstack.potential_contact_ids);
//       }

//       return acc;
//     }, [] as string[])
//     .filter((existingId) => {
//       !contactIds.find((IdFromDupstack) => IdFromDupstack === existingId);
//     });

//   if (!contactToMarkUnchecked || contactToMarkUnchecked.length === 0) {
//     return;
//   }

//   const { error: error2 } = await supabase
//     .from("contacts")
//     .update({ dup_checked: false })
//     .eq("workspace_id", workspaceId)
//     .in("id", contactToMarkUnchecked);
//   if (error2) {
//     throw error2;
//   }

//   const { error: error3 } = await supabase
//     .from("dup_stacks")
//     .delete()
//     .in(
//       "id",
//       existingDupStacks.map((v) => v.id)
//     )
//     .eq("workspace_id", workspaceId);
//   if (error3) {
//     throw error3;
//   }

//   contactIds.forEach((id) => {
//     contactsById[id].dup_checked = false;
//   });
// }
