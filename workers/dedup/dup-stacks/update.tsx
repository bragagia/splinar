import { Database } from "@/types/supabase";
import {
  areCompaniesDups,
  createCompanyDupstack,
  fetchNextCompanyReference,
  fetchSimilarCompaniesSortedByFillScore,
  markCompaniesDupstackElementsAsDupChecked,
} from "@/workers/dedup/dup-stacks/companies";
import {
  areContactsDups,
  createContactsDupstack,
  fetchNextContactReference,
  fetchSimilarContactsSortedByFillScore,
  markContactDupstackElementsAsDupChecked,
} from "@/workers/dedup/dup-stacks/contacts";
import { resolveNextDuplicatesStack } from "@/workers/dedup/dup-stacks/resolve-next-dup-stack";
import { SupabaseClient } from "@supabase/supabase-js";

export async function updateContactsDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 25,
  intervalStop: number = 200
) {
  return await genericUpdateDupStacks(
    () =>
      resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        areContactsDups,
        fetchNextContactReference,
        fetchSimilarContactsSortedByFillScore,
        createContactsDupstack,
        markContactDupstackElementsAsDupChecked
      ),
    callbackOnInterval,
    intervalCallback,
    intervalStop
  );
}

export async function updateCompaniesDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 25,
  intervalStop: number = 200
) {
  return await genericUpdateDupStacks(
    () =>
      resolveNextDuplicatesStack(
        supabase,
        workspaceId,
        areCompaniesDups,
        fetchNextCompanyReference,
        fetchSimilarCompaniesSortedByFillScore,
        createCompanyDupstack,
        markCompaniesDupstackElementsAsDupChecked
      ),
    callbackOnInterval,
    intervalCallback,
    intervalStop
  );
}

async function genericUpdateDupStacks(
  resolveNextDuplicatesStack: () => Promise<boolean>,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 25,
  intervalStop: number = 200
) {
  let counter = 0;

  do {
    const hasFoundContact = await resolveNextDuplicatesStack();
    if (!hasFoundContact) {
      if (callbackOnInterval) await callbackOnInterval();

      return false;
    }

    counter++;
    if (callbackOnInterval && counter % intervalCallback === 0) {
      await callbackOnInterval();
    }
    if (counter % intervalStop === 0) {
      return true;
    }
  } while (true);
}
