"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { InsertMergedContactType } from "@/types/contacts";
import {
  DupStackWithContactsAndCompaniesType,
  getDupstackConfidents,
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

  contactMerge(supabase, workspace, dupStack, hsClient);
}

export async function contactMerge(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceType,
  dupStack: DupStackWithContactsAndCompaniesType,
  hsClient: Client
) {
  const referenceContact = getDupstackReference(dupStack);
  const contactsToMerge = getDupstackConfidents(dupStack);
  const contactIdsToMarkFalsePositive = getDupstackPotentials(dupStack); // TODO:
  if (!referenceContact) {
    throw new Error("Missing reference contact");
  }

  if (!referenceContact || !contactsToMerge || contactsToMerge.length === 0) {
    return;
    // TODO: Handle the case where no contacts to merge, but some contacts to mark as false positive
  }

  // TODO: We should catch if there is an error, and still save the merged contacts

  await Promise.all(
    contactsToMerge.map(async (contactToMerge) => {
      await hsClient?.crm.contacts.publicObjectApi.merge({
        primaryObjectId: referenceContact.contact?.hs_id.toString() || "",
        objectIdToMerge: contactToMerge.contact?.hs_id.toString() || "",
      });
    })
  );

  const mergedContacts: InsertMergedContactType[] = contactsToMerge.map(
    (contact) => ({
      workspace_id: workspace.id,
      hs_id: contact.contact?.hs_id || 0,
      merged_in_hs_id: referenceContact.contact?.hs_id || 0,

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

  if (
    contactIdsToMarkFalsePositive &&
    contactIdsToMarkFalsePositive.length > 0
  ) {
    const { error: errorUpdateDupStack } = await supabase
      .from("dup_stack_contacts")
      .delete()
      .eq("dupstack_id", dupStack.id)
      .in(
        "contact_id",
        contactsToMerge.map((dupStackContact) => dupStackContact.contact?.id)
      )
      .eq("workspace_id", workspace.id);

    if (errorUpdateDupStack) {
      captureException(errorUpdateDupStack);
    }
  } else {
    const { error: errorDeleteDupstack } = await supabase
      .from("dup_stacks")
      .delete()
      .eq("id", dupStack.id)
      .eq("workspace_id", workspace.id);

    if (errorDeleteDupstack) {
      captureException(errorDeleteDupstack);
    }
  }

  const { error: errorDeleteContacts } = await supabase
    .from("contacts")
    .delete()
    .in(
      "id",
      contactsToMerge.map((dupStackContact) => dupStackContact.contact?.id)
    )
    .eq("workspace_id", workspace.id);
  if (errorDeleteContacts) {
    captureException(errorDeleteContacts);
  }
}
