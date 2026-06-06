import Stripe from "stripe";
export type { TicketType } from "./ticket-config";
export { TICKET_PRICES, TICKET_LABELS } from "./ticket-config";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

// Stripe uses cents — same values as ticket-config but in cents
export const STRIPE_PRICES = {
  earlyBird: 5500,
  regular:   6000,
  late:      6500,
  vip:       12500,
  ga:        500,
};
