import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export type GenericDupStack = {
  // note: first item of confident_contact_ids is considered to be the reference contact
  confident_ids: string[];
  potential_ids: string[];
};

export async function resolveNextDuplicatesStack<T extends { id: string }, ST>(
  supabase: SupabaseClient<Database>,
  workspaceId: string,

  areItemsDups: (itemA: T, itemB: T) => "CONFIDENT" | "POTENTIAL" | false,

  fetchNextReference: (
    supabase: SupabaseClient<Database>,
    workspaceId: string
  ) => Promise<T | undefined>,

  fetchSortedSimilar: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    itemsCacheById: {
      [key: string]: T;
    },
    parentId: string
  ) => Promise<{ parentItem: T; similarItems: T[] }>,

  createDupstack: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    genericDupstack: GenericDupStack
  ) => Promise<void>,

  markDupstackElementsAsDupChecked: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    dupstackIds: string[]
  ) => Promise<void>,

  itemsCacheById: {
    [key: string]: T;
  } = {},

  startWithItem?: T
): Promise<boolean> {
  let referenceItem: T;

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

  function isAT(obj: any): obj is T {
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
        areItemsDups,
        fetchNextReference,
        fetchSortedSimilar,
        createDupstack,
        markDupstackElementsAsDupChecked,
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

    await createDupstack(supabase, workspaceId, dupStack);
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
