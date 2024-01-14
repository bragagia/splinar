import { resolveNextDuplicatesStack } from "@/inngest/dedup/dup-stacks/resolve-next-dup-stack";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function updateDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  callbackOnInterval?: () => Promise<void>,
  intervalCallback: number = 25,
  intervalStop: number = 200
) {
  let counter = 0;

  do {
    const hasFoundContact = await resolveNextDuplicatesStack(
      supabase,
      workspaceId
    );
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
