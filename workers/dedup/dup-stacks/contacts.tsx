import { uuid } from "@/lib/uuid";
import {
  ContactSimilarityType,
  ContactWithCompaniesAndRawSimilaritiesType,
  ContactWithCompaniesAndSimilaritiesType,
  SUPABASE_FILTER_MAX_SIZE,
} from "@/types/database-types";
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

const contactScoring = {
  fullname: {
    exact: 30,
    similar: 20,
    potential: 5,
    unlikely: 0,
    notMatching: -70,
    sameCompanyMatchingBonus: 30,
  },
  phone: {
    exact: 20, // phones can be shared like a company, but can also be unique, not sure what to do about them
    similar: 0,
    potential: 0,
    unlikely: 0,
    notMatching: 0,
    sameCompanyMatchingBonus: 0,
  },
  email: {
    exact: 80,
    similar: 60,
    potential: 40,
    unlikely: 0,
    notMatching: -10,
    sameCompanyMatchingBonus: 30,
  },
  company: {
    // This is a multiplier for the "sameCompanyMatchingBonus"
    exact: 1,
    similar: 0.33, // TODO: in the future, when there will be deduplication of companies, this should go to zero because similar companies shouldn't be considered the same at this point
    potential: 0,
    unlikely: 0,
    notMatching: 0,
    sameCompanyMatchingBonus: 0,
  },
};

const ContactFieldsList: ContactFieldsType[] = ["fullname", "email", "phone"];

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
  contactA: ContactWithCompaniesAndSimilaritiesType,
  contactB: ContactWithCompaniesAndSimilaritiesType
): "CONFIDENT" | "POTENTIAL" | false {
  if (!contactA || !contactB) {
    return false;
  }

  const similaritiesOfContacts = contactA.contact_similarities.filter(
    (similarity) =>
      similarity.contact_a_id === contactB.id ||
      similarity.contact_b_id === contactB.id
  );

  const contactAFields = listContactField(contactA);
  const contactBFields = listContactField(contactB);

  const filledField = Math.min(contactA.filled_score, contactB.filled_score);

  let unmatchingFieldCount = 0;
  let similarityScore = 0;

  // Calc similarity multiplier
  let companySimilarity = similaritiesOfContacts.find(
    (similarity) => similarity.field_type === "company"
  );
  const sameCompanyBonusMultiplier = companySimilarity
    ? contactScoring["company"][companySimilarity.similarity_score]
    : 0;

  ContactFieldsList.forEach((field) => {
    let similarity = similaritiesOfContacts.find(
      (similarity) => similarity.field_type === field
    );

    if (!similarity) {
      if (
        contactAFields.find((cf) => cf === field) &&
        contactBFields.find((cf) => cf === field)
      ) {
        unmatchingFieldCount++; // TODO: Use notMatchingFieldsScore instead
      }

      return;
    }

    similarityScore +=
      contactScoring[field][similarity.similarity_score] +
      sameCompanyBonusMultiplier *
        contactScoring[field]["sameCompanyMatchingBonus"];
  });

  const missingFieldsMultiplierBonus = (() => {
    switch (filledField) {
      case 1:
        return 2;
      case 2:
        return 1.5;
      case 3:
        return 1.2;
      default:
        return 1;
    }
  })();

  const unmatchingFieldMalus = unmatchingFieldCount * 20; // TODO: missing logic to use score

  const score =
    (similarityScore - unmatchingFieldMalus) * missingFieldsMultiplierBonus;
  if (score >= 70) {
    return "CONFIDENT";
  } else if (score >= 30) {
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
  const dupstack: Database["public"]["Tables"]["dup_stacks"]["Insert"] = {
    id: dupstackId,
    workspace_id: workspaceId,
    item_type: "CONTACTS",
  };

  const dupstackContacts: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"][] =
    [];

  dupstackContacts.push(
    ...genericDupstack.confident_ids.map((id, i) => {
      const ret: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"] =
        {
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
      const ret: Database["public"]["Tables"]["dup_stack_contacts"]["Insert"] =
        {
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
