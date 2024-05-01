import { areItemsDups } from "@/inngest/workspace-install-dupstacks/are-items-dups";
import { ItemTypeT } from "@/lib/items_common";
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

  startWithItem?: ItemWithSimilaritiesType,

  isDemo: boolean = false
): Promise<boolean> {
  console.log("## Resolving next dupstack");

  const startTime = performance.now();

  let referenceItem: ItemWithSimilaritiesType;

  if (startWithItem) {
    console.log("Starting with item", startWithItem.id);
    referenceItem = startWithItem;
  } else {
    const { existingDupstackIds, item } = await fetchNextReference(
      supabase,
      workspaceId
    );

    if (!item) {
      return false;
    }

    if (existingDupstackIds.length > 0) {
      console.log(
        "Reference item already part of existing dupstacks",
        existingDupstackIds
      );
      console.log(
        "Deleting those dupstack and restart resolveNextDuplicatesStack"
      );

      if (!isDemo) {
        await deleteExistingDupstacks(
          supabase,
          workspaceId,
          itemsCacheById,
          [item.id],
          false
        );

        // Note: It is potentially an other item that will be the next reference
        return await resolveNextDuplicatesStack(
          supabase,
          workspaceId,
          itemsCacheById,
          undefined,
          isDemo
        );
      }
    }

    referenceItem = item;
    console.log("Reference item", referenceItem.id);
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
    isChildOfPotentialDup: boolean,
    depth: number = 0
  ) {
    const prefix = "·".repeat(depth + 1);

    console.log(
      prefix + "Adding childs to stack",
      parentId,
      isChildOfPotentialDup
    );
    let { parentItem, similarItems } = await fetchSortedSimilar(
      supabase,
      workspaceId,
      itemsCacheById,
      parentId
    );
    if (similarItems.length === 0) {
      console.log(prefix + "No similar items found");
      return;
    }

    let childsNewDuplicates: GenericDupStack = {
      confident_ids: [],
      potential_ids: [],
    };

    console.log(prefix + "Similar items: ", similarItems.length, "items");

    for (let similarItem of similarItems) {
      console.log("Checking similar item", similarItem.id);

      const isInDupstack =
        dupStack.confident_ids.find((id) => similarItem.id === id) ||
        dupStack.potential_ids.find((id) => similarItem.id === id);

      if (isInDupstack) {
        console.log("Item already in dupstack", similarItem.id);
        continue;
      }

      let dupStatus = areItemsDups(parentItem, similarItem);
      console.log("Dup status", dupStatus);

      if (dupStatus !== false) {
        const isMoreFilledThanReference =
          similarItem.filled_score > referenceItem.filled_score;
        const isSameFilledThanReferenceAndIdIsLower =
          similarItem.filled_score === referenceItem.filled_score &&
          similarItem.id_seq < referenceItem.id_seq;

        if (
          isMoreFilledThanReference ||
          isSameFilledThanReferenceAndIdIsLower
        ) {
          // We first check is this item is already part of an existing dupstack
          const { data: existingDupstackIds, error } = await supabase
            .from("dup_stack_items")
            .select("dupstack_id")
            .eq("workspace_id", workspaceId)
            .eq("item_id", similarItem.id);
          if (error) {
            throw error;
          }

          // if it is not:
          if (!existingDupstackIds || existingDupstackIds.length === 0) {
            // Restart the whole function with similarContact as reference, because it has more data
            throw similarItem;
          }
        }

        if (dupStatus === "CONFIDENT") {
          if (!isChildOfPotentialDup) {
            childsNewDuplicates.confident_ids.push(similarItem.id);
          } else {
            // If we are a child of a potential dup, we are also a potential dup
            childsNewDuplicates.potential_ids.push(similarItem.id);
          }
        } else if (dupStatus === "POTENTIAL") {
          // If we are a child of a potential dup, we don't add more potential dups
          //if (!isChildOfPotentialDup) {
          childsNewDuplicates.potential_ids.push(similarItem.id);
          //}
        }
      }
    }

    // We push all childs before calling recursive to prevent going into a deep and expensive call stack
    dupStack.confident_ids.push(...childsNewDuplicates.confident_ids);
    dupStack.potential_ids.push(...childsNewDuplicates.potential_ids);

    for (let id of childsNewDuplicates.confident_ids) {
      await addChildsToStack(id, false, depth + 1);
    }
    for (let id of childsNewDuplicates.potential_ids) {
      await addChildsToStack(id, true, depth + 1);
    }
  }

  function isAT(obj: any): obj is ItemWithSimilaritiesType {
    if (!obj) return false;
    return "id" in obj;
  }

  try {
    await addChildsToStack(referenceItem.id, false);
    console.log("Added main child to stack", referenceItem.id);
  } catch (newReferenceItem) {
    if (isAT(newReferenceItem)) {
      console.log(
        "########### [PERF] resolveNextDupStack FIRST ATTEMPT:",
        Math.round(performance.now() - startTime),
        "ms"
      );

      console.log("##### Starting again with new reference");

      return await resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        itemsCacheById,
        newReferenceItem,
        isDemo
      );
    } else {
      console.log("Error in addChildsToStack", newReferenceItem);
      throw newReferenceItem;
    }
  }

  // dupStack empty == only the reference element
  const dupStackIsEmpty =
    dupStack.confident_ids.length <= 1 && dupStack.potential_ids.length == 0;

  const allDupsId = [...dupStack.confident_ids, ...dupStack.potential_ids];

  if (isDemo) {
    console.log("Demo:", dupStack);
  } else {
    if (!dupStackIsEmpty) {
      await deleteExistingDupstacks(
        supabase,
        workspaceId,
        itemsCacheById,
        dupStack.confident_ids
      );

      await createDupstack(
        supabase,
        workspaceId,
        dupStack,
        referenceItem.item_type
      );
    }

    // Mark dupstack elements as dup_checked, at least the contact that was analysed
    await markDupstackElementsAsDupChecked(supabase, workspaceId, allDupsId);
  }

  console.log(
    "########### [PERF] resolveNextDupStack:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return true;
}

// Delete existing dupstacks that contains one of the provided items as confident/reference (and potential if ), and mark all those items as not dup_checked
async function deleteExistingDupstacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemsCacheById: {
    [key: string]: ItemWithSimilaritiesType;
  },
  itemIds: string[],
  onlyConfidents = true
) {
  const startTime = performance.now();

  let query = supabase
    .from("dup_stack_items")
    .select("dup_stacks!inner(id)")
    .eq("workspace_id", workspaceId)
    .in("item_id", itemIds);

  if (onlyConfidents) {
    query = query.in("dup_type", ["REFERENCE", "CONFIDENT"]);
  }

  const { data: existingDupStacksIds, error } = await query;

  if (error) {
    throw error;
  }

  if (!existingDupStacksIds || existingDupStacksIds.length === 0) {
    console.log(
      "########### [PERF] resolveNextDupStack:",
      Math.round(performance.now() - startTime),
      "ms"
    );

    return;
  }

  const uniqueExistingDupStacksIds = existingDupStacksIds.reduce(
    (acc, dupstack) => {
      if (acc.find((v) => v === dupstack.dup_stacks.id)) {
        return acc;
      }

      acc.push(dupstack.dup_stacks.id);
      return acc;
    },
    [] as string[]
  );

  const { data: existingDupStacksData, error: error1 } = await supabase
    .from("dup_stacks")
    .select("*, dup_stack_items(*)")
    .eq("workspace_id", workspaceId)
    .in("id", uniqueExistingDupStacksIds);
  if (error1) {
    throw error1;
  }

  const existingDupStackItemsIds = existingDupStacksData.reduce(
    (acc, dupstack) => {
      acc.push(...dupstack.dup_stack_items.map((v) => v.item_id));
      return acc;
    },
    [] as string[]
  );

  console.log("Deleting existing dupstacks", uniqueExistingDupStacksIds.length);

  const { error: errorDeleteDupstack } = await supabase
    .from("dup_stacks")
    .delete()
    .in("id", uniqueExistingDupStacksIds)
    .eq("workspace_id", workspaceId);
  if (errorDeleteDupstack) {
    throw errorDeleteDupstack;
  }

  // We list items part of existing dupstacks but not part of the new one, in most of the cases it should be none
  const itemsToMarkUnchecked = existingDupStackItemsIds.filter((existingId) => {
    !itemIds.find((IdFromDupstack) => IdFromDupstack === existingId);
  });
  if (itemsToMarkUnchecked.length === 0) {
    console.log(
      "########### [PERF] resolveNextDupStack:",
      Math.round(performance.now() - startTime),
      "ms"
    );

    return;
  }

  console.log("Marking items as not dup_checked", itemsToMarkUnchecked.length);

  const { error: error2 } = await supabase
    .from("items")
    .update({ dup_checked: false })
    .eq("workspace_id", workspaceId)
    .in("id", itemsToMarkUnchecked);
  if (error2) {
    throw error2;
  }

  itemIds.forEach((id) => {
    itemsCacheById[id].dup_checked = false;
  });

  console.log(
    "########### [PERF] deleteExistingDupstacks:",
    Math.round(performance.now() - startTime),
    "ms"
  );
}

async function fetchNextReference(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const startTime = performance.now();

  const { data, error } = await supabase.rpc("get_dupstack_next_reference", {
    arg_workspace_id: workspaceId,
  });
  if (error) {
    throw error;
  }
  if (!data || data.length === 0 || !data[0]) {
    return {
      existingDupstackIds: undefined,
      item: undefined,
    };
  }

  const res = data[0];
  if (
    !res.item ||
    !res.similarities ||
    !Array.isArray(res.similarities) ||
    !Array.isArray(res.item) ||
    !res.item[0]
  ) {
    return {
      existingDupstackIds: undefined,
      item: undefined,
    };
  }

  const item = res.item[0] as Tables<"items">;

  const itemWithSim = {
    ...item,
    similarities: res.similarities.filter(
      (sim) => sim
    ) as Tables<"similarities">[], // Filter because if no similarities, it returns null
  };

  let uniqueDupstackIds: string[] = [];
  if (
    res.dup_stack_items &&
    Array.isArray(res.dup_stack_items) &&
    res.dup_stack_items.length > 0
  ) {
    const dup_stack_items =
      res.dup_stack_items as (Tables<"dup_stack_items"> | null)[];

    uniqueDupstackIds = dup_stack_items.reduce((acc, dup_stack_item) => {
      if (
        !dup_stack_item ||
        acc.find((v) => v === dup_stack_item.dupstack_id)
      ) {
        return acc;
      }

      acc.push(dup_stack_item.dupstack_id);
      return acc;
    }, [] as string[]);
  }

  console.log(
    "### [PERF] fetchNextContactReference:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return {
    existingDupstackIds: uniqueDupstackIds,
    item: itemWithSim,
  };
}

export async function fetchSortedSimilar(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsCacheById: {
    [key: string]: ItemWithSimilaritiesType;
  },
  parentContactId: string
) {
  const startTime = performance.now();

  const parentContact = contactsCacheById[parentContactId];

  let res = {
    parentItem: contactsCacheById[parentContactId],
    similarItems: [] as ItemWithSimilaritiesType[],
  };

  console.log("Get cached contacts");
  const similarContactsIds = parentContact.similarities.reduce(
    (acc, similarity) => {
      const similarID =
        similarity.item_a_id === parentContactId
          ? similarity.item_b_id
          : similarity.item_a_id;

      if (acc.find((v) => v === similarID)) {
        return acc;
      }

      acc.push(similarID);
      return acc;
    },
    [] as string[]
  );

  console.log("Similar contacts ids", similarContactsIds.length);

  let similarContactsIdsToFetch: string[] = [];

  similarContactsIds.forEach((id, i) => {
    const cachedContact = contactsCacheById[id];

    if (cachedContact) {
      res.similarItems.push(cachedContact);
    } else {
      similarContactsIdsToFetch.push(id);
    }
  });

  console.log("Similar contacts to fetch", similarContactsIdsToFetch.length);

  if (similarContactsIdsToFetch.length > 0) {
    let fetchedContactsRaw: ItemWithRawSimilaritiesType[] = [];

    for (
      let i = 0;
      i < similarContactsIdsToFetch.length;
      i += SUPABASE_FILTER_MAX_SIZE
    ) {
      console.log(
        "Fetching similar contacts",
        i,
        similarContactsIdsToFetch.length
      );
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
        console.log("error fetching", error);
        throw error;
      }

      fetchedContactsRaw.push(...data);
    }

    console.log("Done fetching");

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

  console.log(
    "### [PERF] fetchSimilarSortedByFillScore:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return res;
}

async function createDupstack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  genericDupstack: GenericDupStack,
  itemType: ItemTypeT
) {
  const startTime = performance.now();

  console.log(
    "Creating dupstack containting: ",
    genericDupstack.confident_ids.length,
    "confident and",
    genericDupstack.potential_ids.length,
    "potential dups"
  );

  const dupstackId = uuid();
  const dupstack: TablesInsert<"dup_stacks"> = {
    id: dupstackId,
    workspace_id: workspaceId,
    item_type: itemType,
  };

  const dupstackItems: TablesInsert<"dup_stack_items">[] = [];

  dupstackItems.push(
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

  dupstackItems.push(
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
    .insert(dupstackItems);
  if (errorDupstackContact) {
    throw errorDupstackContact;
  }

  console.log(
    "### [PERF] createDupstack:",
    Math.round(performance.now() - startTime),
    "ms"
  );
}

async function markDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackIds: string[]
) {
  const startTime = performance.now();

  console.log("Marking dupstack elements as dup_checked", dupstackIds.length);

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

  console.log(
    "### [PERF] markDupstackElementsAsDupChecked:",
    Math.round(performance.now() - startTime),
    "ms"
  );
}
