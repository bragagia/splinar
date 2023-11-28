"use server";

import { newHubspotClient } from "@/lib/hubspot";
import {
  DupStackWithContactsType,
  getDupstackConfidents,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { captureException } from "@sentry/node";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function contactMerge(
  workspaceId: string,
  dupStack: DupStackWithContactsType
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

  let hsClient = await newHubspotClient(workspace.refresh_token);

  const referenceContact = getDupstackReference(dupStack);
  const contactsToMerge = getDupstackConfidents(dupStack);
  const contactIdsToMarkFalsePositive = getDupstackPotentials(dupStack); // TODO:
  if (!referenceContact) {
    throw new Error("Missing reference contact");
  }

  if (!referenceContact || !contactsToMerge || contactsToMerge.length === 0) {
    throw Error("Contact fetched from db are incoherent with dup stack");
  }

  await Promise.all(
    contactsToMerge.map(
      async (contactToMerge) =>
        await hsClient.crm.contacts.publicObjectApi.merge({
          primaryObjectId: referenceContact.contact?.hs_id.toString() || "",
          objectIdToMerge: contactToMerge.contact?.hs_id.toString() || "",
        })
    )
  );

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
      .eq("workspace_id", workspaceId);

    if (errorUpdateDupStack) {
      captureException(errorUpdateDupStack);
    }
  } else {
    const { error: errorDeleteDupstack } = await supabase
      .from("dup_stacks")
      .delete()
      .eq("id", dupStack.id)
      .eq("workspace_id", workspaceId);

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
    .eq("workspace_id", workspaceId);
  if (errorDeleteContacts) {
    captureException(errorDeleteContacts);
  }
}
