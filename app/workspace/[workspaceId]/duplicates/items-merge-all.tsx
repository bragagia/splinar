"use server";

import { inngest } from "@/inngest";
import { ItemTypeT } from "@/lib/items_common";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function itemsMergeAllSA(
  workspaceId: string,
  itemType: ItemTypeT,
  includePotentials: boolean
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  let { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (workspaceError) {
    throw workspaceError;
  }
  if (!workspace) {
    throw new Error("Missing workspace");
  }

  await inngest.send({
    name: "items/merge-all.start",
    data: {
      workspaceId: workspaceId,
      itemType: itemType,
      includePotentials: includePotentials,
    },
  });
}
