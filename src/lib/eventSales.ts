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
const CLOSED_STATUSES = new Set(["draft", "cancelled", "completed"]);

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
