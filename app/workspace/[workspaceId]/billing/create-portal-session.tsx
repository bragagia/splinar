"use server";

import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { getStripe } from "@/lib/stripe";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { URLS } from "@/lib/urls";
import { redirect } from "next/navigation";

export async function createPortalSession(workspace_id: string) {
  const supabase = newSupabaseServerClient();

  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  const workspaceSubscription = await getWorkspaceCurrentSubscription(
    supabase,
    workspace_id
  );
  if (!workspaceSubscription) {
    throw new Error("missing workspace subscription");
  }

  if (workspaceSubscription.canceled_at) {
    throw new Error("Cannot manage a canceled subscription");
  }

  if (
    workspaceSubscription.sub_type !== "STRIPE" ||
    !workspaceSubscription.stripe_customer_id ||
    !workspaceSubscription.stripe_subscription_id ||
    !workspaceSubscription.stripe_subscription_item_id
  ) {
    throw new Error("Only stripe subscription are manageable");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspaceSubscription.stripe_customer_id,
    return_url: URLS.absolute(URLS.workspace(workspace_id).settings),
  });

  redirect(portalSession.url);
}
