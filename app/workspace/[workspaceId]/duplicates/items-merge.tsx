"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { getItemTypeConfig } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import {
  DupStackWithItemsT,
  getDupstackConfidents,
  getDupstackFalsePositives,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { Database, Tables } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import {
  SupabaseClient,
  createServerActionClient,
} from "@supabase/auth-helpers-nextjs";
import dayjs from "dayjs";
import { cookies } from "next/headers";

export async function itemsMergeSA(
  workspaceId: string,
  dupStack: DupStackWithItemsT,
  hsClient?: Client
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

  let { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!sessionData.session) {
    throw new Error("Missing user session");
  }

  if (!hsClient) {
    hsClient = await newHubspotClient(workspace.refresh_token);
  }

  await itemsMerge(supabase, workspace, dupStack, hsClient, true);
}

export async function itemsMerge(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  dupStackFromFront: DupStackWithItemsT,
  hsClient: Client,
  markPotentialAsFalsePositives: boolean = false
) {
  // TODO: We still receive dupstack as argument but we should remove that

  const dupStackR = await supabase
    .from("dup_stacks")
    .select("*, dup_stack_items(*, item:items(*))")
    .eq("workspace_id", workspace.id)
    .eq("id", dupStackFromFront.id)
    .limit(1)
    .single();
  if (dupStackR.error) {
    throw dupStackR.error;
  }
  let dupStack = dupStackR.data;

  const referenceDSItem = getDupstackReference(dupStack);
  const dsItemsToMerge = getDupstackConfidents(dupStack);
  const itemIdsToMarkFalsePositive = getDupstackPotentials(dupStack);
  const falsePositives = getDupstackFalsePositives(dupStack);
  const referenceItem = referenceDSItem.item;

  const distantMergeFn = getItemTypeConfig(
    dupStack.item_type
  ).getDistantMergeFn(hsClient);

  if (!referenceDSItem || !referenceItem) {
    throw new Error("Missing reference item");
  }

  if (referenceDSItem && dsItemsToMerge && dsItemsToMerge.length > 0) {
    // TODO: We should catch if there is an error, and still save the merged contacts
    await Promise.all(
      dsItemsToMerge.map(async (dsItemToMerge) => {
        const itemToMerge = dsItemToMerge.item;
        if (!itemToMerge) {
          throw new Error("Missing item");
        }

        await distantMergeFn({
          primaryObjectId: referenceItem.distant_id,
          objectIdToMerge: itemToMerge.distant_id,
        });

        const { error } = await supabase
          .from("items")
          .update({
            merged_in_distant_id: referenceItem.distant_id,
            merged_at: dayjs().toISOString(),
          })
          .eq("id", itemToMerge.id)
          .eq("workspace_id", workspace.id);
        if (error) {
          captureException(error);
        }

        const { error: errorDeleteSims } = await supabase
          .from("similarities")
          .delete()
          .or(`item_a_id.eq.${itemToMerge.id},item_b_id.eq.${itemToMerge.id}`)
          .eq("workspace_id", workspace.id);
        if (errorDeleteSims) {
          captureException(errorDeleteSims);
        }

        const { error: errorUpdateDupStack } = await supabase
          .from("dup_stack_items")
          .delete()
          .eq("dupstack_id", dupStack.id)
          .eq("item_id", itemToMerge.id)
          .eq("workspace_id", workspace.id);

        if (errorUpdateDupStack) {
          captureException(errorUpdateDupStack);
        }
      })
    );
  }

  if (falsePositives.length === 0 && itemIdsToMarkFalsePositive.length === 0) {
    const { error: errorDeleteDupstack } = await supabase
      .from("dup_stacks")
      .delete()
      .eq("id", dupStack.id)
      .eq("workspace_id", workspace.id);

    if (errorDeleteDupstack) {
      captureException(errorDeleteDupstack);
    }
  } else {
    if (
      markPotentialAsFalsePositives &&
      itemIdsToMarkFalsePositive.length > 0
    ) {
      const { error } = await supabase
        .from("dup_stack_items")
        .update({ dup_type: "FALSE_POSITIVE" })
        .eq("dupstack_id", dupStack.id)
        .in(
          "item_id",
          itemIdsToMarkFalsePositive.map((dupStackItem) => dupStackItem.item_id)
        )
        .eq("workspace_id", workspace.id);

      if (error) {
        captureException(error);
      }
    }
  }
}
