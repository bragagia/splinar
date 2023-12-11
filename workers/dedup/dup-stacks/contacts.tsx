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
import { GenericDupStack } from "@/workers/dedup/dup-stacks/resolve-next-dup-stack";
import {
  ContactFieldsType,
  listContactField,
} from "@/workers/dedup/list-contact-fields";
import { SupabaseClient } from "@supabase/supabase-js";

/*
 * ALGO
 */

type ValueScoringType = {
  exact?: number;
  similar?: number;
  potential?: number;
  unlikely?: number;

  exactMultiplier?: number;
  similarMultiplier?: number;
  potentialMultiplier?: number;
  unlikelyMultiplier?: number;

  notMatchingMalus?: number;
  notMatchingMalusMultiplier?: number;

  emptyBonus?: number;
  emptyBonusMultiplier?: number;
};

const contactScoring: { [key: string]: ValueScoringType } = {
  fullname: {
    exact: 40,
    similar: 30,
    potential: 5,
    unlikely: 0,

    notMatchingMalus: -80,

    emptyBonusMultiplier: 1.2,
  },

  email: {
    exact: 90,
    similar: 80,
    potential: 40,
    unlikely: 5,

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  phone: {
    exact: 70, // phones can be shared like a company, but can also be unique, not sure what to do about them
    similar: 0,
    potential: 0,
    unlikely: 0,

    notMatchingMalus: -30,

    emptyBonusMultiplier: 1.2,
  },

  company: {
    exactMultiplier: 1,
    similarMultiplier: 0.9, // TODO: in the future, when there will be deduplication of companies, this should go to zero because similar companies shouldn't be considered the same at this point

    notMatchingMalus: -10,
    notMatchingMalusMultiplier: 0.7,

    emptyBonusMultiplier: 1,
  },
};

const ContactFieldsList: ContactFieldsType[] = [
  "fullname",
  "email",
  "phone",
  "company",
];

// TODO: Same company -> Multiply the chance that they are the same, but does not increase score by itself

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
  itemA: ContactWithCompaniesAndSimilaritiesType,
  itemB: ContactWithCompaniesAndSimilaritiesType,
  verbose: boolean = false
): "CONFIDENT" | "POTENTIAL" | false {
  if (!itemA || !itemB) {
    return false;
  }

  const similarities = itemA.contact_similarities.filter(
    (similarity) =>
      similarity.contact_a_id === itemB.id ||
      similarity.contact_b_id === itemB.id
  );

  const itemAFields = listContactField(itemA);
  const itemBFields = listContactField(itemB);

  let score = 0;
  let multiplier = 1;

  ContactFieldsList.forEach((field) => {
    let similarity = similarities.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      if (
        itemAFields.find((cf) => cf === field) &&
        itemBFields.find((cf) => cf === field)
      ) {
        const notMatchingMalus = contactScoring[field]["notMatchingMalus"] || 0;
        score += notMatchingMalus;

        if (verbose && notMatchingMalus)
          console.log(`[${field}] notMatchingMalus: ${notMatchingMalus}`);

        const notMatchingMalusMultiplier =
          contactScoring[field]["notMatchingMalusMultiplier"] || 1;
        multiplier *= notMatchingMalusMultiplier;

        if (verbose && notMatchingMalusMultiplier !== 1)
          console.log(
            `[${field}] notMatchingMalusMultiplier: ${notMatchingMalusMultiplier}`
          );
      } else {
        const emptyBonus = contactScoring[field]["emptyBonus"] || 0;
        score += emptyBonus;

        if (verbose && emptyBonus)
          console.log(`[${field}] emptyBonus: ${emptyBonus}`);

        const emptyBonusMultiplier =
          contactScoring[field]["emptyBonusMultiplier"] || 1;
        multiplier *= emptyBonusMultiplier;

        if (verbose && emptyBonusMultiplier !== 1)
          console.log(
            `[${field}] emptyBonusMultiplier: ${emptyBonusMultiplier}`
          );
      }
    } else {
      const similarityBonus =
        contactScoring[field][similarity.similarity_score] || 0;
      score += similarityBonus;

      if (verbose && similarityBonus)
        console.log(
          `[${field}] similarityBonus (${similarity.similarity_score}): ${similarityBonus}`
        );

      const similarityBonusMultiplier =
        (contactScoring[field] as any)[
          similarity.similarity_score + "Multiplier"
        ] || 1;
      multiplier *= similarityBonusMultiplier;

      if (verbose && similarityBonusMultiplier !== 1)
        console.log(
          `[${field}] similarityBonusMultiplier (${similarity.similarity_score}): ${similarityBonusMultiplier}`
        );
    }
  });

  const finalScore = score * multiplier;
  if (verbose)
    console.log(`finalScore = ${score} * ${multiplier} = ${finalScore}`);

  if (finalScore >= 80) {
    return "CONFIDENT";
  } else if (finalScore >= 35) {
    return "POTENTIAL";
  } else {
    return false;
  }
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
  const { error: errorChecked } = await supabase
    .from("contacts")
    .update({ dup_checked: true })
    .in("id", dupstackIds)
    .eq("workspace_id", workspaceId);
  if (errorChecked) {
    throw errorChecked;
  }
}
