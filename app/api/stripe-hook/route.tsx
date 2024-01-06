import { inngest } from "@/inngest";
import { getStripe } from "@/lib/stripe";
import { Database } from "@/types/supabase";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Can't get stripe");
  }

  const body = await request.text();
  let event: Stripe.Event;

  const signature = request.headers.get("stripe-signature")?.toString();
  if (!signature) {
    console.log("Strip hook missing signature");
    return NextResponse.json({}, { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_HOOK_SECRET!
    );
  } catch (err: any) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return NextResponse.json({}, { status: 400 });
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let subscription: Stripe.Subscription;
  let status: Stripe.Subscription.Status;
  // Handle the event
  switch (event.type) {
    case "customer.subscription.created":
      subscription = event.data.object;
      await handleSubscriptionUpdatedOrCreated(supabaseAdmin, subscription);
      break;

    case "customer.subscription.deleted":
      subscription = event.data.object;
      await handleSubscriptionUpdatedOrCreated(supabaseAdmin, subscription);
      break;

    case "customer.subscription.updated":
      subscription = event.data.object;
      await handleSubscriptionUpdatedOrCreated(supabaseAdmin, subscription);
      break;

    default:
      // Known hunhandled events that shouldn't happen:
      // customer.subscription.paused
      // customer.subscription.pending_update_applied
      // customer.subscription.pending_update_expired
      // customer.subscription.resumed
      // customer.subscription.trial_will_end
      if (process.env.NODE_ENV === "development") {
        console.log(`Stripe hook: Unhandled event type ${event.type}.`);
      } else {
        // Ignoring in dev mode because we receive all hooks
        throw new Error(`Stripe hook: Unhandled event type ${event.type}.`);
      }
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({});
}

export async function handleSubscriptionUpdatedOrCreated(
  supabaseAdmin: SupabaseClient<Database>,
  subscription: Stripe.Subscription
) {
  const subscriptionItemId = subscription.items.data[0].id;
  const workspaceId = subscription.metadata["workspace_id"];
  const status = subscription.status;

  console.log("Stripe hook for workspace:", subscription.metadata);
  console.log(`Subscription status is ${status}.`);

  if (status === "incomplete" || status === "incomplete_expired") {
    console.log("Ignoring");
    return;
  }

  if (status === "trialing") {
    throw new Error("Stripe hook: Trialing is not handled");
  }

  if (status === "paused") {
    throw new Error("Stripe hook: Pausing is not handled");
  }

  // if (status === "active" || "past_due" || "canceled" || "unpaid")
  const isCancelledNow = status === "canceled" || status === "unpaid";

  const currentSubscription = await supabaseAdmin
    .from("workspace_subscriptions")
    .select()
    .eq("stripe_subscription_id", subscription.id)
    .limit(1)
    .single();
  const subscriptionAlreadyExist = currentSubscription.error ? false : true;

  // (check for subscription failed case)
  const { error } = await supabaseAdmin
    .from("workspace_subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        sub_type: "STRIPE",
        stripe_customer_id: subscription.customer.toString(),
        stripe_subscription_id: subscription.id,
        stripe_subscription_item_id: subscriptionItemId,
        canceled_at: isCancelledNow
          ? dayjs().toISOString()
          : subscription.cancel_at_period_end
          ? dayjs.unix(subscription.current_period_end).toISOString()
          : null,
      },
      { onConflict: "stripe_subscription_id" }
    )
    .select();
  if (error) {
    throw error;
  }

  if (!subscriptionAlreadyExist) {
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
}
