"use server";

import { contactMerge } from "@/app/serverActions/contacts-merge";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function contactMergeAll(workspaceId: string) {
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

  let hsClient = await newHubspotClient(workspace.refresh_token);

  // We only do 50 at a time, letting the front do the loop
  let lastItemCreatedAt: string | null = null;
  do {
    let query = supabase
      .from("dup_stacks")
      .select(
        "*, dup_stack_items:dup_stack_contacts(*, contact:contacts(*, companies(*)))"
      )
      .eq("workspace_id", workspaceId)
      .eq("item_type", "CONTACTS")
      .order("created_at", { ascending: true })
      .limit(50);

    if (lastItemCreatedAt) {
      query = query.gt("created_at", lastItemCreatedAt);
    }

    let { data: dupStacks, error: dupStacksError } = await query;
    if (dupStacksError) {
      throw dupStacksError;
    }
    if (!dupStacks || dupStacks.length === 0) {
      return;
    }

    lastItemCreatedAt = dupStacks[dupStacks.length - 1].created_at;

    await Promise.all(
      dupStacks.map(async (dupStack) => {
        try {
          await contactMerge(dupStack.workspace_id, dupStack, hsClient);
        } catch (e) {
          console.log(e);
        }
      })
    );
  } while (lastItemCreatedAt);
}
