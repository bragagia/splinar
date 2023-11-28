import {
  ContactWithCompaniesType,
  SUPABASE_FILTER_MAX_SIZE,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { contactSimilarityCheck } from "@/workers/dedup/similarity/contacts-similarity-check";
import { SupabaseClient } from "@supabase/supabase-js";

async function compareContactBatches(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchA: ContactWithCompaniesType[],
  batchB: ContactWithCompaniesType[]
) {
  let similarities: Database["public"]["Tables"]["contact_similarities"]["Insert"][] =
    [];
  batchA.forEach((contactA) => {
    let contactSimilarities = contactSimilarityCheck(
      workspaceId,
      contactA,
      batchB
    );

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let { error } = await supabase
    .from("contact_similarities")
    .insert(similarities);
  if (error) {
    throw error;
  }
}

async function compareContactBatchWithItself(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batch: ContactWithCompaniesType[]
) {
  let similarities: Database["public"]["Tables"]["contact_similarities"]["Insert"][] =
    [];
  batch.forEach((contact, i) => {
    let contactSimilarities = contactSimilarityCheck(
      workspaceId,
      contact,
      batch.slice(0, i)
    );

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let { error } = await supabase
    .from("contact_similarities")
    .insert(similarities);
  if (error) {
    throw error;
  }
}

async function fetchBatch(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchIds: string[]
) {
  let batch: ContactWithCompaniesType[] = [];

  for (let i = 0; i < batchIds.length; i += SUPABASE_FILTER_MAX_SIZE) {
    const { data: batchSlice, error } = await supabase
      .from("contacts")
      .select("*, companies(*)")
      .eq("workspace_id", workspaceId)
      .in("id", batchIds.slice(i, i + SUPABASE_FILTER_MAX_SIZE));
    if (error || !batchSlice) {
      throw error;
    }

    batch.push(...batchSlice);
  }

  return batch;
}

export async function similaritiesBatchEval(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  batchAIds: string[],
  batchBIds?: string[]
) {
  const batchA = await fetchBatch(supabase, workspaceId, batchAIds);

  if (!batchBIds) {
    await compareContactBatchWithItself(supabase, workspaceId, batchA);

    return;
  } else {
    const batchB = await fetchBatch(supabase, workspaceId, batchBIds);

    await compareContactBatches(supabase, workspaceId, batchA, batchB);
  }

  await supabase.rpc("similarities_increment_done_batches", {
    workspace_id_arg: workspaceId,
  });
}
