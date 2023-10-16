import {
  Similarity,
  contactSimilarityCheck,
} from "@/app/serverActions/contacts_similarity_check";
import { resolveDuplicatesStacks } from "@/app/serverActions/resolve_duplicates_stacks";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: hsContacts, error } = await supabase
    .from("hs_contacts")
    .select();
  if (error) {
    return Response.error();
  }

  let similarities: Similarity[] = [];
  hsContacts.forEach((a, i) => {
    let contactSimilarities = contactSimilarityCheck(a, hsContacts.slice(0, i));

    if (contactSimilarities && contactSimilarities.length > 0) {
      similarities.push(...contactSimilarities);
    }
  });

  let dupStacks = resolveDuplicatesStacks(hsContacts, similarities);

  return Response.json({ contacts: hsContacts, dupStacks: dupStacks });
}
