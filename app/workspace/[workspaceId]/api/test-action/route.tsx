import { ContactSimilarityType, WorkspaceType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { installDupStacks } from "@/workers/dedup/dup-stacks/install";
import {
  SupabaseClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const maxDuration = 300;

async function CalcDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const startTime = performance.now();

  console.log(
    "### Install dup stacks",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installDupStacks(supabase, workspaceId);

  let workspaceUpdateEnd: Partial<WorkspaceType> = {
    installation_status: "DONE",
  };
  await supabase
    .from("workspaces")
    .update(workspaceUpdateEnd)
    .eq("id", workspaceId);

  console.log(
    "### Install done",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
}

async function CalcDbCache(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from("contacts")
    .select(
      `*,
      companies(*),
      similarities_a:contact_similarities!contact_similarities_contact_a_id_fkey(*), similarities_b:contact_similarities!contact_similarities_contact_b_id_fkey(*)`
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
      contact_similarities: raw_contact.similarities_a.concat(
        raw_contact.similarities_b
      ) as ContactSimilarityType[],
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
