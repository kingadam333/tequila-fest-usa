/**
 * Canonical ticket type display names.
 * All raw keys from Stripe metadata, old display names, and any other
 * variants are mapped here to a single consistent display name.
 */
export function normalizeTicketType(raw: string): string {
  const s = (raw || "").toLowerCase().trim();
  if (s === "earlybird" || s === "early_bird" || s === "early bird") return "Early Bird";
  if (s === "regular" || s === "regular rate" || s === "regular_rate") return "Regular Rate";
  if (s === "late" || s === "late registration" || s === "late_registration") return "Late Registration";
  if (s === "vip" || s === "vip experience" || s === "vip_experience") return "VIP Experience";
  if (s === "ga" || s === "ga entry" || s === "ga_entry") return "GA";
  return raw; // return as-is if unknown
}

export const TICKET_TYPE_ORDER = [
  "Early Bird",
  "Regular Rate",
  "Late Registration",
  "VIP Experience",
  "GA",
];

/** Sort a byType record into canonical display order */
export function sortByType<T>(byType: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {};
  for (const name of TICKET_TYPE_ORDER) {
    if (byType[name] !== undefined) sorted[name] = byType[name];
  }
  for (const name of Object.keys(byType)) {
    if (sorted[name] === undefined) sorted[name] = byType[name];
  }
  return sorted;
}
