"use server";

import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { inngest } from "@/inngest";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function addCouponSubscription(
  workspaceId: string,
  endDateIsoString: string
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }
  if (!workspaces) {
    throw new Error("Missing workspace");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw sessionError || new Error("Missing session");
  }

  if (process.env.NODE_ENV !== "development") {
    const { data: userRole, error: userRoleError } = await supabase
      .from("user_roles")
      .select()
      .eq("user_id", sessionData.session.user.id)
      .limit(1)
      .single();
    if (userRoleError) {
      throw userRoleError;
    }

    if (userRoleError || userRole.role !== "SUPERADMIN") {
      throw new Error("Must be superadmin");
    }
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const currentSubscription = await getWorkspaceCurrentSubscription(
    supabase,
    workspaceId
  );

  if (currentSubscription) {
    throw new Error("There is already a running subscription");
  }

  const subscriptionCreated = await supabaseAdmin
    .from("workspace_subscriptions")
    .insert({
      workspace_id: workspaceId,
      sub_type: "CUSTOM",
      sub_custom_type: "BETA",
      canceled_at: endDateIsoString,
    });
  if (subscriptionCreated.error) {
    throw subscriptionCreated.error;
  }

  const { error: errorWorkspaceUpdate } = await supabaseAdmin
    .from("workspaces")
    .update({ installation_status: "PENDING" })
    .eq("id", workspaceId);
  if (errorWorkspaceUpdate) {
    throw errorWorkspaceUpdate;
  }

  await inngest.send({
    name: "workspace/install.start",
    data: {
      workspaceId: workspaceId,
      reset: "full",
    },
  });
}
