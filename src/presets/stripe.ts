import type { PresetDefinition } from "../scanner/types";

export const stripePreset: PresetDefinition = {
  name: "stripe",
  description: "Stripe webhook and secret key handling",
  serverEnvNames: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
};
