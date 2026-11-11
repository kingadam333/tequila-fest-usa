// Client-safe rules for "can this event still sell tickets" — no Stripe or
// supabaseAdmin imports, so the event page and the checkout API can share one
// definition instead of each deciding for itself.
//
// Why this exists: ticket buttons used to gate on `status === "completed"`
// alone, with no date check anywhere in the purchase path. Columbus ran on
// 2026-08-08, nobody flipped its status afterwards, and /events/columbus kept
// happily selling tickets to it for five weeks — the homepage hid the card
// (it filters on date) so there was nothing to notice. A forgotten status
// field should never be the only thing standing between a past event and a
// live Stripe session.

// `events.date_iso` stores the event's LOCAL start time written as if it were
// UTC — a 3:00 PM Eastern start is stored as `15:00:00+00`. So the stored
// value is ~4-7h behind the real instant it represents, depending on the
// city's offset. Closing sales a full 24h after the stored start absorbs that
// skew for every US timezone: it can never fire while an event is still
// running (the latest a show ends is ~9 PM local, at most ~11h after the
// stored value in real terms), and it always fires by late morning the next
// day.
const SALES_GRACE_MS = 24 * 60 * 60 * 1000;

/** True once the event is far enough in the past that it cannot be selling. */
export function isEventPast(dateISO: string | null | undefined, now: number = Date.now()): boolean {
  if (!dateISO) return false;
  const start = new Date(dateISO).getTime();
  if (Number.isNaN(start)) return false;
  return now > start + SALES_GRACE_MS;
}

// Statuses that are never purchasable. `sold_out` is deliberately not here —
// capacity is enforced against live ticket counts, not this flag.
//
// `coming_soon` was missing until Nov 2026: the Phoenix page showed COMING
// SOON on its ticket cards, but the bottom "Select Tickets" button only hid
// for completed events and this rule let the checkout through, so three real
// orders were taken for an event that wasn't on sale.
const CLOSED_STATUSES = new Set(["draft", "cancelled", "completed", "coming_soon"]);

/**
 * The single answer to "are ticket sales closed for this event". Treats a
 * past-dated event as completed whether or not its status says so.
 */
export function areTicketSalesClosed(
  status: string | null | undefined,
  dateISO: string | null | undefined,
): boolean {
  if (status && CLOSED_STATUSES.has(status)) return true;
  return isEventPast(dateISO);
}

/**
 * True when an event's display date says it hasn't been set yet ("To Be
 * Announced", "TBA", "TBD"). `date_iso` is NOT NULL, so a TBA event carries a
 * far-future placeholder there to stay listed as upcoming; anything that would
 * show that placeholder to the public (the countdown) must check this first.
 */
export function isDateTBA(displayDate: string | null | undefined): boolean {
  return /\b(to be announced|tba|tbd)\b/i.test(displayDate || "");
}

/** What to tell a buyer whose checkout was refused by areTicketSalesClosed(). */
export function ticketSalesClosedMessage(status: string | null | undefined): string {
  return status === "coming_soon"
    ? "Tickets for this event aren't on sale yet. Check back soon!"
    : "Tickets for this event are no longer on sale.";
}
