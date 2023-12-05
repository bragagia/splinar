import { Database } from "@/types/supabase";
import {
  areContactsDups,
  createContactsDupstack,
  fetchNextContactReference,
  fetchSimilarContactsSortedByFillScore,
  markContactDupstackElementsAsDupChecked,
} from "@/workers/dedup/dup-stacks/contacts";
import { resolveNextDuplicatesStack } from "@/workers/dedup/dup-stacks/resolve-next-dup-stack";
import { SupabaseClient } from "@supabase/supabase-js";

export async function updateDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 5
) {
  let counter = 0;

  do {
    const hasFoundContact = await resolveNextDuplicatesStack(
      supabase,
      workspaceId,
      areContactsDups,
      fetchNextContactReference,
      fetchSimilarContactsSortedByFillScore,
      createContactsDupstack,
      markContactDupstackElementsAsDupChecked
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
