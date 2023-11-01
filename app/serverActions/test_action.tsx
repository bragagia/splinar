"use server";

import { Database } from "@/types/supabase";
import { installDupStacks } from "@/utils/dedup/dup-stacks/install-dup-stacks";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// TODO: delete
export async function TestAction() {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  await installDupStacks(supabase, "BLtGQRfuMMiqsbbYGvCum");
}
