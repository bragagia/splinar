"use server";

import { inngest } from "@/inngest";
import { ItemTypeT } from "@/lib/items_common";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export async function itemsMergeAllSA(
  workspaceId: string,
  itemType: ItemTypeT,
  includePotentials: boolean
) {
  const supabase = newSupabaseServerClient();

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
