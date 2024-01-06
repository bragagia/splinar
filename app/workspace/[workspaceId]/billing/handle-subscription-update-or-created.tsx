import { inngest } from "@/inngest";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import Stripe from "stripe";

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
