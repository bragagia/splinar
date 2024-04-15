import Stripe from "stripe";

let stripe: Stripe | null = null;
export const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
      apiVersion: "2024-04-10",
    });
  }

  return stripe;
};
