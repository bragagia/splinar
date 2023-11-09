import { Database } from "@/types/supabase";
import {
  HsContactType,
  HsContactWithCompaniesAndSimilaritiesType,
  HsDupStackType,
  isAnHsContactWithCompaniesType,
} from "@/utils/database-types";
import { areContactsDups } from "@/utils/dedup/dup-stacks/are-contacts-dups";
import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

async function deleteExistingDupstacksAndMarkUnchecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsById: {
    [key: string]: HsContactWithCompaniesAndSimilaritiesType;
  },
  contactIds: string[]
) {
  let ors = [] as string[];
  contactIds.forEach((contactId) => {
    ors.push('confident_contact_ids.cs.{"' + contactId + '"}');
    ors.push('potential_contact_ids.cs.{"' + contactId + '"}');
  });

  const { data: existingDupStacks, error } = await supabase
    .from("hs_dup_stacks")
    .select()
    .eq("workspace_id", workspaceId)
    .or(ors.join(","));
  if (error) {
    throw error;
  }

  if (!existingDupStacks || existingDupStacks.length === 0) {
    return;
  }

  const contactToMarkUnchecked = existingDupStacks
    .reduce((acc, dupstack) => {
      acc.push(...dupstack.confident_contact_ids);

      if (dupstack.potential_contact_ids) {
        acc.push(...dupstack.potential_contact_ids);
      }

      return acc;
    }, [] as string[])
    .filter((existingId) => {
      !contactIds.find((IdFromDupstack) => IdFromDupstack === existingId);
    });

  if (!contactToMarkUnchecked || contactToMarkUnchecked.length === 0) {
    return;
  }

  const { error: error2 } = await supabase
    .from("hs_contacts")
    .update({ dup_checked: false })
    .eq("workspace_id", workspaceId)
    .in("id", contactToMarkUnchecked);
  if (error2) {
    throw error2;
  }

  const { error: error3 } = await supabase
    .from("hs_dup_stacks")
    .delete()
    .in(
      "id",
      existingDupStacks.map((v) => v.id)
    )
    .eq("workspace_id", workspaceId);
  if (error3) {
    throw error3;
  }

  contactIds.forEach((id) => {
    contactsById[id].dup_checked = false;
  });
}

function fetchContactAndSimilarSortedByFillScore(
  contactsById: {
    [key: string]: HsContactWithCompaniesAndSimilaritiesType;
  },
  contactId: string
) {
  /*const { data: contact, error: error0 } = await supabase
    .from("hs_contacts")
    .select("*, hs_companies (*)")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .single();
  if (error0) {
    throw error0;
  }
  let res = {
    contact: contact as HsContactWithCompaniesType,
    similarContacts: [] as HsContactWithCompaniesAndSimilaritiesType[],
  };

  // Fetch the contact similarities first
  const { data, error: error1 } = await supabase
    .from("hs_contact_similarities")
    .select()
    .eq("workspace_id", workspaceId)
    .or(`contact_a_id.eq.${contactId}, contact_b_id.eq.${contactId}`);
  if (error1) {
    throw error1;
  }
  const similarities = data as HsContactSimilarityType[];
  if (!similarities) {
    return res;
  }

  // Extract contact IDs from response
  let similarContactIDs = similarities.reduce((acc, item) => {
    const similarID =
      item.contact_a_id === contactId ? item.contact_b_id : item.contact_a_id;

    if (acc.find((v) => v === similarID)) {
      return acc;
    }

    acc.push(similarID);
    return acc;
  }, [] as string[]);

  const { data: similarContacts, error: error3 } = await supabase
    .from("hs_contacts")
    .select(
      `*,
      hs_companies (*)`
    )
    .in("id", similarContactIDs)
    .eq("workspace_id", workspaceId)
    .order("filled_score", { ascending: false });
  if (error3) {
    throw error3;
  }

  res.similarContacts = (
    similarContacts as HsContactWithCompaniesAndSimilaritiesType[]
  ).map((similarContact) => {
    const contactSimilarities = similarities.reduce((acc, similarity) => {
      if (
        similarity.contact_a_id === similarContact.id ||
        similarity.contact_b_id === similarContact.id
      ) {
        acc.push(similarity);
      }

      return acc;
    }, [] as HsContactSimilarityType[]);

    return {
      ...similarContact,
      hs_contact_similarities: contactSimilarities,
    };
  });

  return res;*/

  let res = {
    contact: contactsById[contactId],
    similarContacts: [] as HsContactWithCompaniesAndSimilaritiesType[],
  };

  res.similarContacts = res.contact.hs_contact_similarities
    .reduce((acc, item) => {
      const similarID =
        item.contact_a_id === contactId ? item.contact_b_id : item.contact_a_id;

      if (acc.find((v) => v === similarID)) {
        return acc;
      }

      acc.push(similarID);
      return acc;
    }, [] as string[])
    .map((id) => contactsById[id])
    .sort((a, b) => b.filled_score - a.filled_score);

  return res;
}

export async function resolveNextDuplicatesStack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsById: {
    [key: string]: HsContactWithCompaniesAndSimilaritiesType;
  },
  specificContactId?: string
) {
  let referenceContact: Pick<HsContactType, "id" | "filled_score">;

  if (specificContactId) {
    /*const { data, error } = await supabase
      .from("hs_contacts")
      .select("*, hs_companies (*)")
      .eq("id", specificContactId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) {
      throw error;
    }

    referenceContact = data as HsContactWithCompaniesType;*/

    referenceContact = contactsById[specificContactId];
  } else {
    /*const { data, error } = await supabase
      .from("hs_contacts")
      .select("id, filled_score")
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

    referenceContact = data[0];*/

    const referenceContactId = Object.keys(contactsById).find(
      (id) => contactsById[id].dup_checked === false
    );
    if (!referenceContactId) {
      return false;
    }

    referenceContact = contactsById[referenceContactId];
  }

  //console.log(referenceContact);

  // We recursively check if this contacts or its supposed duplicates have other duplicates to create
  // a "stack" of duplicates. Any contact added to the stack is removed from the checklist to never
  // be added to another stack
  let dupStack: HsDupStackType = {
    id: nanoid(),
    workspace_id: workspaceId,
    confident_contact_ids: [referenceContact.id],
    potential_contact_ids: [],
  };

  async function addChildsToStack(
    parentContactId: string,
    isChildOfPotentialDup: boolean
  ) {
    let { contact: parentContact, similarContacts } =
      fetchContactAndSimilarSortedByFillScore(contactsById, parentContactId);
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
        dupStack.potential_contact_ids?.find((id) => similarContact.id === id);

      if (isInDupstack) {
        return;
      }

      let dupStatus = areContactsDups(
        parentContact,
        similarContact,
        similarContact.hs_contact_similarities.filter(
          (similarity) =>
            similarity.contact_a_id === parentContact.id ||
            similarity.contact_b_id === parentContact.id
        )
      );

      if (dupStatus) {
        const isMoreFilledThanReference =
          similarContact.filled_score > referenceContact.filled_score;

        if (isMoreFilledThanReference) {
          // console.log(
          //   "dups is better, parent: ",
          //   referenceContact,
          //   "\nchild: ",
          //   similarContact
          // );
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
      dupStack.potential_contact_ids?.push(id);
    });
    parentContactNewDuplicates.confident_contact_ids.forEach((id) => {
      addChildsToStack(id, false);
    });
    parentContactNewDuplicates.potential_contact_ids.forEach((id) => {
      addChildsToStack(id, true);
    });
  }

  try {
    await addChildsToStack(referenceContact.id, false);
  } catch (newReferenceContact) {
    if (isAnHsContactWithCompaniesType(newReferenceContact)) {
      //console.log("Going deeper");
      return resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        contactsById,
        newReferenceContact.id
      );
    } else {
      //console.log(newReferenceContact);
      throw newReferenceContact;
    }
  }

  // dupStack empty == only the reference element
  const dupStackIsEmpty =
    dupStack.confident_contact_ids.length <= 1 &&
    !(
      dupStack.potential_contact_ids &&
      dupStack.potential_contact_ids.length > 0
    );

  const allDupsId = [...dupStack.confident_contact_ids];

  if (dupStack.potential_contact_ids) {
    allDupsId.push(...dupStack.potential_contact_ids);
  }

  if (!dupStackIsEmpty) {
    // TODO: Make this work for updates
    // await deleteExistingDupstacksAndMarkUnchecked(
    //   supabase,
    //   workspaceId,
    //   contactsById,
    //   allDupsId
    // );

    const { error: errorDupstack } = await supabase
      .from("hs_dup_stacks")
      .insert(dupStack);
    if (errorDupstack) {
      throw errorDupstack;
    }
  }

  // Mark dupstack elements as dup_checked, at least the contact that was analysed
  await markDupstackElementsAsDupChecked(
    supabase,
    workspaceId,
    contactsById,
    allDupsId
  );

  return true;
}

async function markDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsById: {
    [key: string]: HsContactWithCompaniesAndSimilaritiesType;
  },
  dupstackIds: string[]
) {
  const { error: errorChecked } = await supabase
    .from("hs_contacts")
    .update({ dup_checked: true })
    .in("id", dupstackIds)
    .eq("workspace_id", workspaceId);
  if (errorChecked) {
    throw errorChecked;
  }

  dupstackIds.forEach((id) => {
    contactsById[id].dup_checked = true;
  });
}
