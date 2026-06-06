// Client-safe ticket config — no Stripe SDK imports
export type TicketType = "earlyBird" | "regular" | "late" | "vip" | "ga";

export const TICKET_PRICES: Record<TicketType, number> = {
  earlyBird: 5500,
  regular:   6000,
  late:      6500,
  vip:       12500,
  ga:        500,
};

export const TICKET_LABELS: Record<TicketType, string> = {
  earlyBird: "Early Bird",
  regular:   "Regular Rate",
  late:      "Late Registration",
  vip:       "VIP Experience",
  ga:        "GA Entry",
};
