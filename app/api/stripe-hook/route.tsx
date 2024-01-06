import { handleSubscriptionUpdatedOrCreated } from "@/app/workspace/[workspaceId]/billing/handle-subscription-update-or-created";
import { getStripe } from "@/lib/stripe";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
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
