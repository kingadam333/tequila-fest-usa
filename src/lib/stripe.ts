import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

// Ticket price IDs — create these in your Stripe dashboard as Products
// or use dynamic pricing (we use dynamic below)
export const TICKET_PRICES = {
  earlyBird: 5500,   // $55.00 in cents
  regular:   6000,   // $60.00
  late:      6500,   // $65.00
  vip:       12500,  // $125.00
  ga:        500,    // $5.00
};

export type TicketType = "earlyBird" | "regular" | "late" | "vip" | "ga";

export const TICKET_LABELS: Record<TicketType, string> = {
  earlyBird: "All Inclusive — Early Bird",
  regular:   "All Inclusive — Regular Rate",
  late:      "All Inclusive — Late Registration",
  vip:       "VIP",
  ga:        "GA Entry",
};
