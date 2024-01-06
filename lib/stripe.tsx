import Stripe from "stripe";

let stripe: Stripe | null = null;
export const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
      apiVersion: "2023-10-16",
    });
  }

  return stripe;
};
