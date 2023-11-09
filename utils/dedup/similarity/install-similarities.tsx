import { Database } from "@/types/supabase";
import {
  HsContactSimilarityType,
  HsContactWithCompaniesType,
} from "@/utils/database-types";
import { contactSimilarityCheck } from "@/utils/dedup/similarity/contacts-similarity-check";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

const BATCH_SIZE = 300;
const SUPABASE_FILTER_MAX_SIZE = 300;

async function compareContactBatches(
  supabase: SupabaseClient<Database>,
  workspace_id: string,
  batchA: HsContactWithCompaniesType[],
  batchB: HsContactWithCompaniesType[]
) {
  let similarities: HsContactSimilarityType[] = [];
  batchA.forEach((contactA) => {
    let contactSimilarities = contactSimilarityCheck(
      workspace_id,
      contactA,
      batchB
    );

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let { error } = await supabase
    .from("hs_contact_similarities")
    .insert(similarities);
  if (error) {
    throw error;
  }
}

async function compareContactBatchWithItself(
  supabase: SupabaseClient<Database>,
  workspace_id: string,
  batch: HsContactWithCompaniesType[]
) {
  let similarities: HsContactSimilarityType[] = [];
  batch.forEach((contact, i) => {
    let contactSimilarities = contactSimilarityCheck(
      workspace_id,
      contact,
      batch.slice(0, i)
    );

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let { error } = await supabase
    .from("hs_contact_similarities")
    .insert(similarities);
  if (error) {
    throw error;
  }
}

async function markBatchInstalled(
  supabase: SupabaseClient<Database>,
  batch: HsContactWithCompaniesType[]
) {
  const batchIds = batch.map((contact) => contact.id);

  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { error } = await supabase
      .from("hs_contacts")
      .update({ similarity_checked: true, dup_checked: false })
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error) {
      throw error;
    }
  }
}

async function compareBatchWithAllInstalledContacts(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batch: HsContactWithCompaniesType[],
  afterBatchCallback?: () => Promise<void>
) {
  let lastItemId: string | null = null;
  do {
    let query = supabase
      .from("hs_contacts")
      .select("*, hs_companies(*)")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", true)
      .order("id")
      .limit(BATCH_SIZE);

    if (lastItemId) {
      query = query.gt("id", lastItemId);
    }

    const { data: installedBatch, error: errorInstalledBatch } = await query;
    if (errorInstalledBatch) {
      console.log("errorInstalledBatch", errorInstalledBatch);
      break;
    }
    if (!installedBatch || installedBatch.length === 0) {
      break;
    }

    await compareContactBatches(supabase, workspaceId, batch, installedBatch);

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    lastItemId = installedBatch[installedBatch.length - 1].id;
    if (installedBatch.length !== BATCH_SIZE) {
      lastItemId = null;
    }
  } while (lastItemId);
}

async function updateSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  afterBatchCallback?: () => Promise<void>
) {
  let batchLength = 0;
  do {
    let query = supabase
      .from("hs_contacts")
      .select("*, hs_companies(*)")
      .eq("workspace_id", workspaceId)
      .eq("similarity_checked", false)
      .limit(BATCH_SIZE);

    const { data: batch, error: error } = await query;
    if (error) {
      throw error;
    }
    if (!batch || batch.length === 0) {
      break;
    }
    batchLength = batch.length;

    await compareContactBatchWithItself(supabase, workspaceId, batch);

    if (afterBatchCallback) {
      await afterBatchCallback();
    }

    await compareBatchWithAllInstalledContacts(
      supabase,
      workspaceId,
      batch,
      afterBatchCallback
    );

    await markBatchInstalled(supabase, batch);
  } while (batchLength === BATCH_SIZE);

  console.log("Marking contact without similarities as checked");

  const { error } = await supabase.rpc(
    "mark_contacts_without_similarities_as_dup_checked",
    { workspace_id_arg: workspaceId }
  );
  if (error) {
    throw error;
  }
}

export async function installSimilarities(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { count: hsContactsCount, error: errorContactsCount } = await supabase
    .from("hs_contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorContactsCount || !hsContactsCount) {
    throw errorContactsCount || new Error("hsContactCount: missing");
  }

  let batchTotal = Math.ceil(hsContactsCount / BATCH_SIZE);
  let totalOperations = (batchTotal + 1) * (batchTotal / 2);

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_similarity_total_batches: totalOperations,
      installation_similarity_done_batches: 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }

  let batchDones = 0;
  async function incrementBatchDones() {
    batchDones += 1;

    console.log("Similarities batch done: ", batchDones);

    await supabase
      .from("workspaces")
      .update({ installation_similarity_done_batches: batchDones })
      .eq("id", workspaceId);
  }

  await updateSimilarities(supabase, workspaceId, incrementBatchDones);
}
