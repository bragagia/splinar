"use server";

import { installDupStacks } from "@/defer/dup-stacks/install-dup-stacks";
import { Database } from "@/types/supabase";
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
