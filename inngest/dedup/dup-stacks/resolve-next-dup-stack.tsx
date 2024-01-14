import { areItemsDups } from "@/inngest/dedup/dup-stacks/are-items-dups";
import { itemTypeT } from "@/lib/items_common";
import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { uuid } from "@/lib/uuid";
import {
  ItemWithRawSimilaritiesType,
  ItemWithSimilaritiesType,
} from "@/types/items";
import { Database, Tables, TablesInsert } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export type GenericDupStack = {
  // note: first item of confident_contact_ids is considered to be the reference contact
  confident_ids: string[];
  potential_ids: string[];
};

export async function resolveNextDuplicatesStack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,

  itemsCacheById: {
    [key: string]: ItemWithSimilaritiesType;
  } = {},

  startWithItem?: ItemWithSimilaritiesType
): Promise<boolean> {
  let referenceItem: ItemWithSimilaritiesType;

  if (startWithItem) {
    referenceItem = startWithItem;
  } else {
    const item = await fetchNextReference(supabase, workspaceId);

    if (!item) {
      return false;
    }

    referenceItem = item;
  }
  itemsCacheById[referenceItem.id] = referenceItem;

  // We recursively check if this item or its supposed duplicates have other duplicates to create
  // a "stack" of duplicates. Any item added to the stack is removed from the checklist to never
  // be added to another stack

  let dupStack: GenericDupStack = {
    confident_ids: [referenceItem.id],
    potential_ids: [],
  };

  async function addChildsToStack(
    parentId: string,
    isChildOfPotentialDup: boolean
  ) {
    let { parentItem, similarItems } = await fetchSortedSimilar(
      supabase,
      workspaceId,
      itemsCacheById,
      parentId
    );
    if (similarItems.length === 0) {
      return;
    }

    let childsNewDuplicates: GenericDupStack = {
      confident_ids: [],
      potential_ids: [],
    };

    similarItems.forEach((similarItem) => {
      const isInDupstack =
        dupStack.confident_ids.find((id) => similarItem.id === id) ||
        dupStack.potential_ids.find((id) => similarItem.id === id);

      if (isInDupstack) {
        return;
      }

      let dupStatus = areItemsDups(parentItem, similarItem);

      // TODO: This must be thought about when doing hook update
      // if (dupStatus) {
      //   const isMoreFilledThanReference =
      //     similarItem.filled_score > referenceItem.filled_score;

      //   if (isMoreFilledThanReference) {
      //     // Restart the whole function with similarContact as reference, because it has more data
      //     throw similarItem;
      //   }
      // }

      if (dupStatus === "CONFIDENT" && !isChildOfPotentialDup) {
        childsNewDuplicates.confident_ids.push(similarItem.id);
      } else if (dupStatus) {
        // Even if the dup is confident, if we descent from a potential dup, we only add it as a potential too
        childsNewDuplicates.potential_ids.push(similarItem.id);
      }
    });

    // We push all childs before calling recursive to prevent going into a deep and expensive call stack
    childsNewDuplicates.confident_ids.forEach((id) => {
      dupStack.confident_ids.push(id);
    });
    childsNewDuplicates.potential_ids.forEach((id) => {
      dupStack.potential_ids.push(id);
    });
    await Promise.all(
      childsNewDuplicates.confident_ids.map(async (id) => {
        await addChildsToStack(id, false);
      })
    );
    await Promise.all(
      childsNewDuplicates.potential_ids.map(async (id) => {
        await addChildsToStack(id, true);
      })
    );
  }

  function isAT(obj: any): obj is ItemWithSimilaritiesType {
    if (!obj) return false;
    return "id" in obj;
  }

  try {
    await addChildsToStack(referenceItem.id, false);
  } catch (newReferenceItem) {
    if (isAT(newReferenceItem)) {
      return await resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        itemsCacheById,
        newReferenceItem
      );
    } else {
      throw newReferenceItem;
    }
  }

  // dupStack empty == only the reference element
  const dupStackIsEmpty =
    dupStack.confident_ids.length <= 1 && dupStack.potential_ids.length == 0;

  const allDupsId = [...dupStack.confident_ids, ...dupStack.potential_ids];

  if (!dupStackIsEmpty) {
    // TODO: Make this work for updates
    // await deleteExistingDupstacksAndMarkUnchecked(
    //   supabase,
    //   workspaceId,
    //   contactsById,
    //   allDupsId
    // );

    await createDupstack(
      supabase,
      workspaceId,
      dupStack,
      referenceItem.item_type
    );
  }

  // Mark dupstack elements as dup_checked, at least the contact that was analysed
  await markDupstackElementsAsDupChecked(supabase, workspaceId, allDupsId);

  return true;
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

async function fetchNextReference(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  // const startTime = performance.now();
  const { data, error } = await supabase
    .from("items")
    .select(
      `*,
      similarities_a:similarities!similarities_item_a_id_fkey(*), similarities_b:similarities!similarities_item_b_id_fkey(*)`
    )
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false)
    .order("filled_score", { ascending: false })
    .limit(1);
  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    return undefined;
  }

  const { similarities_a, similarities_b, ...contact } = {
    ...data[0],
    similarities: data[0].similarities_a.concat(
      data[0].similarities_b
    ) as Tables<"similarities">[],
  };

  //console.log(
  //  "### [PERF] fetchNextContactReference:",
  //  Math.round(performance.now() - startTime),
  //  "ms"
  //);

  return contact;
}

export async function fetchSortedSimilar(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsCacheById: {
    [key: string]: ItemWithSimilaritiesType;
  },
  parentContactId: string
) {
  // const startTime = performance.now();

  const parentContact = contactsCacheById[parentContactId];

  let res = {
    parentItem: contactsCacheById[parentContactId],
    similarItems: [] as ItemWithSimilaritiesType[],
  };

  const similarContactsIds = parentContact.similarities.reduce((acc, item) => {
    const similarID =
      item.item_a_id === parentContactId ? item.item_b_id : item.item_a_id;

    if (acc.find((v) => v === similarID)) {
      return acc;
    }

    acc.push(similarID);
    return acc;
  }, [] as string[]);

  let similarContactsIdsToFetch: string[] = [];

  similarContactsIds.forEach((id, i) => {
    const cachedContact = contactsCacheById[id];

    if (cachedContact) {
      res.similarItems.push(cachedContact);
    } else {
      similarContactsIdsToFetch.push(id);
    }
  });

  if (similarContactsIdsToFetch.length > 0) {
    let fetchedContactsRaw: ItemWithRawSimilaritiesType[] = [];

    for (
      let i = 0;
      i < similarContactsIdsToFetch.length;
      i += SUPABASE_FILTER_MAX_SIZE
    ) {
      const { data, error } = await supabase
        .from("items")
        .select(
          `*,
          similarities_a:similarities!similarities_item_a_id_fkey(*), similarities_b:similarities!similarities_item_b_id_fkey(*)`
        )
        .is("merged_in_distant_id", null)
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
        similarities: raw_contact.similarities_a.concat(
          raw_contact.similarities_b
        ) as Tables<"similarities">[],
      };

      return contact;
    });

    fetchedContacts.forEach((contact) => {
      res.similarItems.push(contact);
      contactsCacheById[contact.id] = contact;
    });
  }

  res.similarItems.sort((a, b) => b.filled_score - a.filled_score);

  //console.log(
  //  "### [PERF] fetchSimilarContactsSortedByFillScore:",
  //  Math.round(performance.now() - startTime),
  //  "ms"
  //);

  return res;
}

async function createDupstack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  genericDupstack: GenericDupStack,
  itemType: itemTypeT
) {
  // const startTime = performance.now();

  const dupstackId = uuid();
  const dupstack: TablesInsert<"dup_stacks"> = {
    id: dupstackId,
    workspace_id: workspaceId,
    item_type: itemType,
  };

  const dupstackContacts: TablesInsert<"dup_stack_items">[] = [];

  dupstackContacts.push(
    ...genericDupstack.confident_ids.map((id, i) => {
      const ret: TablesInsert<"dup_stack_items"> = {
        item_id: id,
        dup_type: i === 0 ? "REFERENCE" : "CONFIDENT",
        dupstack_id: dupstackId,
        workspace_id: dupstack.workspace_id,
      };
      return ret;
    })
  );

  dupstackContacts.push(
    ...genericDupstack.potential_ids.map((id, i) => {
      const ret: TablesInsert<"dup_stack_items"> = {
        item_id: id,
        dup_type: "POTENTIAL",
        dupstack_id: dupstackId,
        workspace_id: dupstack.workspace_id,
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
    .from("dup_stack_items")
    .insert(dupstackContacts);
  if (errorDupstackContact) {
    throw errorDupstackContact;
  }

  //console.log(
  //  "### [PERF] createContactsDupstack:",
  //  Math.round(performance.now() - startTime),
  //  "ms"
  //);
}

async function markDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackIds: string[]
) {
  // const startTime = performance.now();

  for (let i = 0; i < dupstackIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error: errorChecked } = await supabase
      .from("items")
      .update({ dup_checked: true })
      .in("id", dupstackIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE))
      .eq("workspace_id", workspaceId);
    if (errorChecked) {
      throw errorChecked;
    }
  }

  //console.log(
  //  "### [PERF] markContactDupstackElementsAsDupChecked:",
  //  Math.round(performance.now() - startTime),
  //  "ms"
  //);
}
