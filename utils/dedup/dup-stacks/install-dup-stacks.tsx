import {
  ContactSimilarityType,
  ContactWithCompaniesAndSimilaritiesType,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { resolveNextDuplicatesStack } from "@/utils/dedup/dup-stacks/resolve-duplicates-stack-new";
import { SupabaseClient } from "@supabase/supabase-js";

async function fetchContactsDb(
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
    .order("filled_score", { ascending: false });
  if (error) {
    throw error;
  }

  const contacts = data.map((raw_contact) => {
    const { similarities_a, similarities_b, ...contact } = {
      ...raw_contact,
      contact_similarities: raw_contact.similarities_a.concat(
        raw_contact.similarities_b
      ) as ContactSimilarityType[],
    };

    return contact;
  });

  let contactsById: {
    [key: string]: ContactWithCompaniesAndSimilaritiesType;
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

  //const contactsById = await fetchContactsDb(supabase, workspaceId);

  do {
    let contactsById: {
      [key: string]: ContactWithCompaniesAndSimilaritiesType;
    } = {};

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
  } while (true);
}

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: dupTotal, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || dupTotal === null) {
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
  startTime: number,
  dupTotal: number
) {
  const { count: dupTodo, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error || !dupTodo) {
    console.log(error || new Error("missing count"));
    return;
  }

  const { error: errorUpdate } = await supabase
    .from("workspaces")
    .update({
      installation_dup_done: dupTotal - dupTodo,
    })
    .eq("id", workspaceId);
  if (errorUpdate) {
    console.log(errorUpdate);
    return 0;
  }

  console.log(
    "Dup stack batch",
    dupTotal - dupTodo,
    "/",
    dupTotal,
    "- time:",
    Math.round(performance.now() - startTime),
    "ms"
  );

  return dupTotal - dupTodo;
}

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const dupTotal = await updateDupStackInstallationTotal(supabase, workspaceId);
  const startTime = performance.now();

  await updateDupStacks(
    supabase,
    workspaceId,
    async () => {
      await updateDupStackInstallationDone(
        supabase,
        workspaceId,
        startTime,
        dupTotal
      );
    },
    30
  );
}
