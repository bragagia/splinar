import { Database } from "@/types/supabase";
import { HsContactSimilarityType } from "@/utils/database-types";
import { resolveDuplicatesStacks } from "@/utils/resolve_duplicates_stacks";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const maxDuration = 60;

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: hsContacts, error: errorContacts } = await supabase
    .from("hs_contacts")
    .select();
  if (errorContacts) {
    return Response.error();
  }

  const { data: hsContactSimilarities, error: errorSimilarities } =
    await supabase.from("hs_contact_similarities").select();
  if (errorSimilarities) {
    return Response.error();
  }

  let similarities = hsContactSimilarities as HsContactSimilarityType[];

  let dupStacks = resolveDuplicatesStacks(hsContacts, similarities);

  return Response.json({ contacts: hsContacts, dupStacks: dupStacks });
}
