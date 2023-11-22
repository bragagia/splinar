"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { HsDupStackType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function contactMerge(
  workspaceId: string,
  dupStack: HsDupStackType
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

  let { data: hsContacts, error: errorContact } = await supabase
    .from("hs_contacts")
    .select()
    .in("id", dupStack.confident_contact_ids);
  if (errorContact) {
    throw errorContact;
  }
  if (!hsContacts || hsContacts.length < 2) {
    throw new Error("Error fetching contacts");
  }

  const referenceContact = hsContacts.find(
    (contact) => contact.id === dupStack.confident_contact_ids[0]
  );
  const contactsToMerge = hsContacts.filter(
    (contact) => contact.id !== dupStack.confident_contact_ids[0]
  );
  const contactIdsToMarkFalsePositive = dupStack.potential_contact_ids; // TODO:

  if (!referenceContact || !contactsToMerge || contactsToMerge.length === 0) {
    throw Error("Contact fetched from db are incoherent with dup stack");
  }

  await Promise.all(
    contactsToMerge.map((contactToMerge) => {
      return hsClient.crm.contacts.publicObjectApi.merge({
        primaryObjectId: referenceContact.hs_id,
        objectIdToMerge: contactToMerge.hs_id,
      });
    })
  );

  const { error: errorDeleteContacts } = await supabase
    .from("hs_contacts")
    .delete()
    .in(
      "id",
      contactsToMerge.map((contact) => contact.id)
    );
  if (errorDeleteContacts) {
    console.log(errorDeleteContacts);
  }

  if (
    contactIdsToMarkFalsePositive &&
    contactIdsToMarkFalsePositive.length > 0
  ) {
    const { error: errorUpdateDupStack } = await supabase
      .from("hs_dup_stacks")
      .update({
        confident_contact_ids: [referenceContact.id],
      })
      .eq("id", dupStack.id);

    if (errorUpdateDupStack) {
      console.log(errorUpdateDupStack);
    }
  } else {
    const { error: errorDeleteDupstack } = await supabase
      .from("hs_dup_stacks")
      .delete()
      .eq("id", dupStack.id);

    if (errorDeleteDupstack) {
      console.log(errorDeleteDupstack);
    }
  }
}
