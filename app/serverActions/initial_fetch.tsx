"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import {
  SupabaseClient,
  createServerActionClient,
} from "@supabase/auth-helpers-nextjs";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
) {
  const contacts = await hsClient.crm.contacts.getAll(
    undefined,
    undefined,
    ["email", "firstname", "lastname", "phone", "mobilephone"],
    undefined,
    ["companies"]
  );

  let dbContacts = contacts.map((contact) => {
    let dbContact: Database["public"]["Tables"]["hs_contacts"]["Insert"] = {
      id: nanoid(),
      user_id: userId,
      workspace_id: workspaceId,
      hs_id: contact.id,

      first_name: contact.properties.firstname,
      last_name: contact.properties.lastname,
      phones: [contact.properties.mobilephone, contact.properties.phone].filter(
        (v) => v !== null && v !== undefined
      ) as string[],
      emails: [contact.properties.email].filter(
        (v) => v !== null && v !== undefined
      ) as string[],
      // TODO: company_name: contact.properties.???,
    };

    return dbContact;
  });

  let { error } = await supabase.from("hs_contacts").insert(dbContacts);
  if (error) {
    throw error;
  }
}

export async function initialFetch(workspaceId: string) {
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
  let userId = sessionData.session.user.id;

  let hsClient = await newHubspotClient(workspace.refresh_token);

  await fetchContacts(hsClient, supabase, workspaceId, userId);
}
