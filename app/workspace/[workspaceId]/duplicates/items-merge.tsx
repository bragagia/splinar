"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { getItemTypeConfig } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import {
  DupStackWithItemsT,
  getDupstackConfidents,
  getDupstackFalsePositives,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { Database, Tables } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";
import dayjs from "dayjs";

export async function itemsMergeSA(
  workspaceId: string,
  dupStackId: string,
  hsClient?: Client,
  mergePotentials: boolean = false
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

  const dupStackR = await supabase
    .from("dup_stacks")
    .select("*, dup_stack_items(*, item:items(*))")
    .eq("workspace_id", workspace.id)
    .eq("id", dupStackId)
    .limit(1)
    .single();
  if (dupStackR.error) {
    throw dupStackR.error;
  }
  let dupStack = dupStackR.data;

  if (!hsClient) {
    hsClient = await newHubspotClient(workspace.refresh_token);
  }

  await itemsMerge(supabase, workspace, dupStack, hsClient, mergePotentials);
}

export async function itemsMerge(
  supabase: SupabaseClient<Database>,
  workspace: Tables<"workspaces">,
  dupStack: DupStackWithItemsT,
  hsClient: Client,
  mergePotentials: boolean = false
) {
  // TODO: If there is another dupstack that contains one of the items here, we should remove them from the other dupstack and potentially recalculate those dupstacks

  const referenceDSItem = getDupstackReference(dupStack);
  const referenceItem = referenceDSItem.item;
  const confidents = getDupstackConfidents(dupStack);
  const potentials = getDupstackPotentials(dupStack);
  const falsePositives = getDupstackFalsePositives(dupStack);

  let dsItemsToMerge = confidents;
  if (mergePotentials) {
    dsItemsToMerge.push(...potentials);
  }

  const areItemsRemaining =
    dupStack.dup_stack_items.length - (dsItemsToMerge.length + 1) > 0; // + 1 because the reference item is not in itemsToMerge

  const distantMergeFn = getItemTypeConfig(
    workspace,
    dupStack.item_type
  ).getDistantMergeFn(hsClient);

  if (!referenceDSItem || !referenceItem) {
    throw new Error("Missing reference item");
  }

  if (referenceDSItem && dsItemsToMerge && dsItemsToMerge.length > 0) {
    // TODO: We should catch if there is an error, and still save the merged contacts
    for (const dsItemToMerge of dsItemsToMerge) {
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
    }
  }

  if (!areItemsRemaining) {
    const { error: errorDeleteDupstack } = await supabase
      .from("dup_stacks")
      .delete()
      .eq("id", dupStack.id)
      .eq("workspace_id", workspace.id);

    if (errorDeleteDupstack) {
      captureException(errorDeleteDupstack);
    }
  }
  // else we keep the dupstack for now
  // TODO: Store the false positives elswhere
}
