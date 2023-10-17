"use server";

import { Database } from "@/types/supabase";
import { contactSimilarityCheck } from "@/utils/contacts_similarity_check";
import { HsContactSimilarityType } from "@/utils/database-types";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function initialSimilarityCheck(workspace_id: string) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const { data, error: errorSession } = await supabase.auth.getSession();
  if (errorSession) {
    return Response.error();
  }
  const userId = data.session?.user.id;
  if (!userId) {
    return Response.error();
  }

  const { data: hsContacts, error: errorContacts } = await supabase
    .from("hs_contacts")
    .select()
    .eq("workspace_id", workspace_id);
  if (errorContacts) {
    return Response.error();
  }

  let similarities: HsContactSimilarityType[] = [];
  hsContacts.forEach((a, i) => {
    let contactSimilarities = contactSimilarityCheck(
      userId,
      workspace_id,
      a,
      hsContacts.slice(0, i)
    );

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let { error } = await supabase
    .from("hs_contact_similarities")
    .insert(similarities);
  if (error) {
    return Response.error();
  }

  return Response.json({});
}
