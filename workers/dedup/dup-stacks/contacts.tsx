import { SUPABASE_FILTER_MAX_SIZE } from "@/lib/supabase";
import { uuid } from "@/lib/uuid";
import {
  ContactWithCompaniesAndRawSimilaritiesType,
  ContactWithCompaniesAndSimilaritiesType,
} from "@/types/contacts";
import {
  InsertDupStackContactItemType,
  InsertDupStackType,
} from "@/types/dupstacks";
import { ContactSimilarityType } from "@/types/similarities";
import { Database } from "@/types/supabase";
import { areItemsDups } from "@/workers/dedup/dup-stacks/are-items-dups";
import { GenericDupStack } from "@/workers/dedup/dup-stacks/resolve-next-dup-stack";
import { listContactField } from "@/workers/dedup/list-contact-fields";
import { SupabaseClient } from "@supabase/supabase-js";

/*
 * ALGO
 */

const contactScoring = {
  fullname: {
    exact: 40,
    similar: 30,
    potential: 5,

    notMatchingMalus: -80,

    emptyBonusMultiplier: 1.2,
  },

  email: {
    exact: 180,
    similar: 140,
    potential: 70,
    unlikely: 5,
    unlikelyMultiplier: 1.1,

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  phone: {
    exact: 70, // phones can be shared like a company, but can also be unique

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  company: {
    exactMultiplier: 1.4,

    notMatchingMalus: -10,
    notMatchingMalusMultiplier: 0.7,

    emptyBonusMultiplier: 1,
  },
};

export function areContactsDups(
  itemA: ContactWithCompaniesAndSimilaritiesType,
  itemB: ContactWithCompaniesAndSimilaritiesType,
  verbose: boolean = false
) {
  return areItemsDups(
    itemA,
    itemB,
    verbose,
    itemA.contact_similarities.filter(
      (similarity) =>
        similarity.contact_a_id === itemB.id ||
        similarity.contact_b_id === itemB.id
    ),
    contactScoring,
    listContactField
  );
}

/*
 * Dup stack helpers
 */

export async function fetchNextContactReference(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
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
    return undefined;
  }

  const { similarities_a, similarities_b, ...contact } = {
    ...data[0],
    contact_similarities: data[0].similarities_a.concat(
      data[0].similarities_b
    ) as ContactSimilarityType[],
  };

  return contact;
}

export async function fetchSimilarContactsSortedByFillScore(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsCacheById: {
    [key: string]: ContactWithCompaniesAndSimilaritiesType;
  },
  parentContactId: string
) {
  const parentContact = contactsCacheById[parentContactId];

  let res = {
    parentItem: contactsCacheById[parentContactId],
    similarItems: [] as ContactWithCompaniesAndSimilaritiesType[],
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
      res.similarItems.push(cachedContact);
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
      res.similarItems.push(contact);
      contactsCacheById[contact.id] = contact;
    });
  }

  res.similarItems.sort((a, b) => b.filled_score - a.filled_score);

  return res;
}

export async function createContactsDupstack(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  genericDupstack: GenericDupStack
) {
  const dupstackId = uuid();
  const dupstack: InsertDupStackType = {
    id: dupstackId,
    workspace_id: workspaceId,
    item_type: "CONTACTS",
  };

  const dupstackContacts: InsertDupStackContactItemType[] = [];

  dupstackContacts.push(
    ...genericDupstack.confident_ids.map((id, i) => {
      const ret: InsertDupStackContactItemType = {
        contact_id: id,
        dup_type: i === 0 ? "REFERENCE" : "CONFIDENT",
        dupstack_id: dupstackId,
        workspace_id: dupstack.workspace_id,
      };
      return ret;
    })
  );

  dupstackContacts.push(
    ...genericDupstack.potential_ids.map((id, i) => {
      const ret: InsertDupStackContactItemType = {
        contact_id: id,
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
    .from("dup_stack_contacts")
    .insert(dupstackContacts);
  if (errorDupstackContact) {
    throw errorDupstackContact;
  }
}

export async function markContactDupstackElementsAsDupChecked(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackIds: string[]
) {
  for (let i = 0; i < dupstackIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error: errorChecked } = await supabase
      .from("contacts")
      .update({ dup_checked: true })
      .in("id", dupstackIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE))
      .eq("workspace_id", workspaceId);
    if (errorChecked) {
      throw errorChecked;
    }
  }
}
