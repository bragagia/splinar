"use server";

import { handleSubscriptionUpdatedOrCreated } from "@/app/api/stripe-hook/route";
import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { getStripe } from "@/lib/stripe";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

export async function cancelWorkspaceSubscription(workspace_id: string) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  // note: We check user workspace ownership with non admin supabase
  const workspaceSubscription = await getWorkspaceCurrentSubscription(
    supabase,
    workspace_id
  );
  if (!workspaceSubscription) {
    throw new Error("missing workspace subscription");
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (
    workspaceSubscription.sub_type !== "STRIPE" ||
    !workspaceSubscription.stripe_customer_id ||
    !workspaceSubscription.stripe_subscription_id ||
    !workspaceSubscription.stripe_subscription_item_id
  ) {
    throw new Error("Only stripe subscription are cancellable");
  }

  // Remove normal price and add a zero euro price
  await stripe.subscriptions.update(
    workspaceSubscription.stripe_subscription_id,
    {
      items: [
        {
          price: process.env.STRIPE_ZERO_PRICE_REF!,
        },
        {
          id: workspaceSubscription.stripe_subscription_item_id,
          deleted: true,
          clear_usage: true,
        },
      ],
    }
  );

  const canceledSubscription = await cancelSubscriptionAtPeriodEnd(
    stripe,
    workspaceSubscription.stripe_subscription_id
  );

  await handleSubscriptionUpdatedOrCreated(supabaseAdmin, canceledSubscription);
}

async function cancelSubscriptionAtPeriodEnd(
  stripe: Stripe,
  subscriptionId: string
) {
  try {
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );
    return canceledSubscription;
  } catch (error) {
    console.error("Error in canceling subscription:", error);
    throw error;
  }
}
