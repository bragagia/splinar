"use server";

import { inngest } from "@/inngest";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function workspaceReset(
  workspaceId: string,
  reset: "dup_stacks" | "full" | "similarities_and_dup"
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw error || new Error("missing session");
  }

  // Check for workspace access right
  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (errorWorkspace || workspace === null) {
    throw errorWorkspace || new Error("Missing workspace");
  }

  const { error: errorWorkspaceUpdate } = await supabase
    .from("workspaces")
    .update({ installation_status: "FRESH" })
    .eq("id", workspaceId);
  if (errorWorkspaceUpdate) {
    throw errorWorkspaceUpdate;
  }

  await inngest.send({
    name: "workspace/install.start",
    data: {
      workspaceId: workspaceId,
      reset: reset,
    },
  });
}

/*
  const { error: error1 } = await supabase
    .from("dup_stack_companies")
    .delete()
    .eq("workspace_id", workspaceId);
  if (error1) throw error1;

  const { error: error2 } = await supabase
    .from("dup_stack_contacts")
    .delete()
    .eq("workspace_id", workspaceId);
  if (error2) throw error2;

  const { error: error3 } = await supabase
    .from("dup_stacks")
    .delete()
    .eq("workspace_id", workspaceId);
  if (error3) throw error3;

  let update: Partial<ContactType> = {
    dup_checked: false,
  };

  const { error: error9 } = await supabase
    .from("contacts")
    .update(update)
    .eq("workspace_id", workspaceId);
  if (error9) throw error9;

  const { data, error: blabla } = await supabase
    .from("contacts")
    .select(
      `*,
      companies(*),
      similarities_a:contact_similarities!contact_similarities_contact_a_id_fkey(*), similarities_b:contact_similarities!contact_similarities_contact_b_id_fkey(*)`
    )
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false)
    .order("filled_score", { ascending: false })
    .limit(1)
    .explain();
  console.log(blabla);

  console.log(data);
  return;
*/
