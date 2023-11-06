import { Database } from "@/types/supabase";
import {
  HsContactSimilarityType,
  HsContactWithCompaniesAndSimilaritiesType,
} from "@/utils/database-types";
import { resolveNextDuplicatesStack } from "@/utils/dedup/dup-stacks/resolve-duplicates-stack-new";
import { SupabaseClient } from "@supabase/supabase-js";

async function fetchContactsDb(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from("hs_contacts")
    .select(
      `*,
      hs_companies(*),
      similarities_a:hs_contact_similarities!hs_contact_similarities_contact_a_id_fkey(*), similarities_b:hs_contact_similarities!hs_contact_similarities_contact_b_id_fkey(*)`
    )
    .eq("workspace_id", workspaceId);
  //.order("filled_score", { ascending: false }); -> Not usefull because sorted by id
  if (error) {
    throw error;
  }

  const contacts = data.map((raw_contact) => {
    const { similarities_a, similarities_b, ...contact } = {
      ...raw_contact,
      hs_contact_similarities: raw_contact.similarities_a.concat(
        raw_contact.similarities_b
      ) as HsContactSimilarityType[],
    };

    return contact;
  });

  let contactsById: {
    [key: string]: HsContactWithCompaniesAndSimilaritiesType;
  } = {};

  contacts.forEach((contact) => {
    contactsById[contact.id] = contact;
  });

  return contactsById;
}

export async function updateDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 5
) {
  let counter = 0;

  const contactsById = await fetchContactsDb(supabase, workspaceId);

  do {
    const hasFoundContact = await resolveNextDuplicatesStack(
      supabase,
      workspaceId,
      contactsById
    );
    if (!hasFoundContact) {
      return counter;
    }

    counter++;
    if (callbackOnInterval && counter % intervalCallback === 0) {
      await callbackOnInterval();
    }

    if (counter > 300) return;
  } while (true);
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotal, error } = await supabase
    .from("hs_contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || !dupTotal) {
    throw error || new Error("missing count");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_total: dupTotal,
      installation_dup_done: 0,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  return dupTotal;
}

async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupTotal: number
) {
  const { count: dupTodo, error } = await supabase
    .from("hs_contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || !dupTodo) {
    throw error || new Error("missing count");
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupTotal - dupTodo,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    throw errorUpdate;
  }

  console.log("Dup stack batch ", dupTotal - dupTodo, "/", dupTotal);

  return dupTotal - dupTodo;
}

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);

  await updateDupStacks(supabase, workspaceId, async () => {
    await updateDupStackInstallationDone(supabase, workspaceId, dupTotal);
  });
}
