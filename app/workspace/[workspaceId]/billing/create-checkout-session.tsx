"use server";

import { calcWorkspaceDistantUsageDetailedAction } from "@/app/workspace/[workspaceId]/billing/calc-usage-action";
import { getStripe } from "@/lib/stripe";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createCheckoutSession(workspaceId: string) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const stripe = getStripe();
  if (!stripe) {
    return null;
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

  const { priceTotal } = await calcWorkspaceDistantUsageDetailedAction(
    workspaceId
  );

  // Start checkout session
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    line_items: [
      {
        price: process.env.STRIPE_STANDARD_PRICE_REF!,
      },
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Splinar",
          },
          tax_behavior: "exclusive",
          unit_amount: priceTotal * 100,
        },

        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
      },
    },
    mode: "subscription",
    success_url: URLS.absolute(URLS.workspace(workspaceId).dashboard),
    cancel_url: URLS.absolute(URLS.workspace(workspaceId).billing.canceled),
    automatic_tax: { enabled: true },
  });

  if (!session.url) {
    throw new Error("Stripe: missing session url");
  }

  redirect(session.url);
}
