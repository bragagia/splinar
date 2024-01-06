"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { InsertMergedContactType } from "@/types/contacts";
import {
  DupStackContactItemWithContactAndCompaniesType,
  DupStackWithContactsAndCompaniesType,
  getDupstackConfidents,
  getDupstackFalsePositives,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import { Client } from "@hubspot/api-client";
import { captureException } from "@sentry/node";
import {
  SupabaseClient,
  createServerActionClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function contactMergeSA(
  workspaceId: string,
  dupStack: DupStackWithContactsAndCompaniesType,
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

  await contactMerge(supabase, workspace, dupStack, hsClient, true);
}

export async function contactMerge(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceType,
  dupStack: DupStackWithContactsAndCompaniesType,
  hsClient: Client,
  markPotentialAsFalsePositives: boolean = false
) {
  // SPECIFIC v
  const dupStackItemTable = "dup_stack_contacts";
  const itemTable = "contacts";
  const itemIdColumn = "contact_id";
  const getItemId = (item: DupStackContactItemWithContactAndCompaniesType) =>
    item.contact_id;

  const referenceItem = getDupstackReference(dupStack);
  const itemsToMerge = getDupstackConfidents(dupStack);
  const itemIdsToMarkFalsePositive = getDupstackPotentials(dupStack);
  const falsePositives = getDupstackFalsePositives(dupStack);

  if (!referenceItem) {
    throw new Error("Missing reference item");
  }

  if (referenceItem && itemsToMerge && itemsToMerge.length > 0) {
    // TODO: We should catch if there is an error, and still save the merged contacts
    await Promise.all(
      itemsToMerge.map(async (itemToMerge) => {
        // SPECIFIC v
        await hsClient?.crm.contacts.publicObjectApi.merge({
          primaryObjectId: referenceItem.contact?.hs_id.toString() || "",
          objectIdToMerge: itemToMerge.contact?.hs_id.toString() || "",
        });
      })
    );

    // SPECIFIC v
    const mergedContacts: InsertMergedContactType[] = itemsToMerge.map(
      (contact) => ({
        workspace_id: workspace.id,
        hs_id: contact.contact?.hs_id || 0,
        merged_in_hs_id: referenceItem.contact?.hs_id || 0,

        first_name: contact.contact?.first_name,
        last_name: contact.contact?.last_name,
        emails: contact.contact?.emails,
        phones: contact.contact?.phones,
        companies_hs_id: contact.contact?.companies.map(
          (company) => company.hs_id
        ),
        company_name: contact.contact?.company_name,
      })
    );

    const { error } = await supabase
      .from("merged_contacts")
      .insert(mergedContacts);
    if (error) {
      captureException(error);
    }
  }

  // TODO!!! : contact_companies should be merged too before deleting the merged companies
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
    if (itemsToMerge.length > 0) {
      const { error: errorUpdateDupStack } = await supabase
        .from(dupStackItemTable)
        .delete()
        .eq("dupstack_id", dupStack.id)
        .in(
          itemIdColumn,
          itemsToMerge.map((dupStackItem) => getItemId(dupStackItem))
        )
        .eq("workspace_id", workspace.id);

      if (errorUpdateDupStack) {
        captureException(errorUpdateDupStack);
      }
    }

    if (
      markPotentialAsFalsePositives &&
      itemIdsToMarkFalsePositive.length > 0
    ) {
      const { error } = await supabase
        .from(dupStackItemTable)
        .update({ dup_type: "FALSE_POSITIVE" })
        .eq("dupstack_id", dupStack.id)
        .in(
          itemIdColumn,
          itemIdsToMarkFalsePositive.map((dupStackItem) =>
            getItemId(dupStackItem)
          )
        )
        .eq("workspace_id", workspace.id);

      if (error) {
        captureException(error);
      }
    }
  }

  const { error: errorDeleteItems } = await supabase
    .from(itemTable)
    .delete()
    .in(
      "id",
      itemsToMerge.map((dupStackItem) => getItemId(dupStackItem))
    )
    .eq("workspace_id", workspace.id);

  if (errorDeleteItems) {
    captureException(errorDeleteItems);
  }
}
