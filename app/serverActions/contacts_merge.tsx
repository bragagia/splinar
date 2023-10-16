"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function contactMerge(
  workspaceId: string,
  mainContactId: string,
  contactsId: string[]
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

  contactsId.map((idToMerge) => {
    console.log("MERGING: ", mainContactId, idToMerge);
  });

  Promise.all(
    contactsId.map((idToMerge) => {
      console.log("MERGING: ", mainContactId, idToMerge);
      return hsClient.crm.contacts.publicObjectApi.merge({
        primaryObjectId: mainContactId,
        objectIdToMerge: idToMerge,
      });
    })
  );

  return null;
}
