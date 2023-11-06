import { Database } from "@/types/supabase";
import {
  HsContactSimilarityType,
  HsContactWithCompaniesAndSimilaritiesType,
} from "@/utils/database-types";
import { installDupStacks } from "@/utils/dedup/dup-stacks/install-dup-stacks";
import {
  SupabaseClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const maxDuration = 300;

type DbCache = {
  hsContactsById: { [key: string]: HsContactWithCompaniesAndSimilaritiesType };
};

async function CalcDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  console.log("Install dup stacks", workspaceId);
  await installDupStacks(supabase, workspaceId);

  // let workspaceUpdateEnd: Partial<WorkspaceType> = {
  //   installation_status: "DONE",
  // };
  // await supabase
  //   .from("workspaces")
  //   .update(workspaceUpdateEnd)
  //   .eq("id", workspaceId);
}

async function CalcDbCache(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from("hs_contacts")
    .select(
      `*,
      hs_companies(*),
      similarities_a:hs_contact_similarities!hs_contact_similarities_contact_a_id_fkey(*), similarities_b:hs_contact_similarities!hs_contact_similarities_contact_b_id_fkey(*)`
    )
    .eq("workspace_id", workspaceId)
    .eq("dup_checked", false);
  if (error) {
    console.log(error);
    return;
  }

  const contacts = data.map((raw_contact) => {
    const { similarities_a, similarities_b, ...contact } = {
      ...raw_contact,
      hs_contact_similarities: raw_contact.similarities_a.concat(
        raw_contact.similarities_b
      ) as HsContactSimilarityType[],
    };

    return contact;
  });

  console.log(JSON.stringify(contacts, null, 2));
}

export async function POST(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  if (!params.workspaceId || params.workspaceId === "") {
    return NextResponse.error();
  }
  const workspaceId = params.workspaceId;

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  CalcDupStacks(supabase, workspaceId);

  return NextResponse.json({});
}
