// Which cities brands, sponsors and vendors can sign up for. Server-only.
//
// Why this exists (Nov 2026): Phoenix had no confirmed date, yet a tequila
// brand bought a $350 Phoenix package on Oct 20 and a vendor applied for it,
// because every sign-up picker listed Phoenix unconditionally. The owner's
// rule: a city opens to sign-ups once it has a real date. So a city is closed
// while its event's date is To Be Announced (see isDateTBA) or it has no
// upcoming event at all. A "coming soon" event that HAS a date (Columbus 2027)
// stays open; that was the owner's call, so Ohio isn't shut by it.
import { supabaseAdmin } from "@/lib/supabase";
import { isDateTBA, isEventPast } from "@/lib/eventSales";

export const OHIO_CITY_IDS = ["cleveland", "cincinnati", "columbus"];

export const cityId = (city: string) => city.toLowerCase().trim().replace(/\s+/g, "-");

/** City ids a sign-up option covers: the Ohio bundle is all three Ohio cities. */
export const optionCityIds = (optionId: string) => (optionId === "ohio" ? OHIO_CITY_IDS : [cityId(optionId)]);

/**
 * Lower-case city ids open for sign-ups, or null if the events table couldn't
 * be read. Callers treat null as "don't block": a database blip shouldn't take
 * every sign-up form down with it.
 */
export async function openSignupCities(): Promise<Set<string> | null> {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("events")
    .select("city, date, date_iso, status")
    .gte("date_iso", today)
    .not("status", "in", '("draft","cancelled","completed")');
  if (error) {
    console.error("[eventSignups] events lookup failed:", error.message);
    return null;
  }
  const open = new Set<string>();
  for (const e of (data || []) as { city: string; date: string; date_iso: string }[]) {
    if (e.city && !isDateTBA(e.date) && !isEventPast(e.date_iso)) open.add(cityId(e.city));
  }
  return open;
}

/** True if every city the option covers is open (null = unknown = open). */
export const isOptionOpen = (open: Set<string> | null, optionId: string) =>
  !open || optionCityIds(optionId).every((c) => open.has(c));

/** The given option ids that are currently closed. */
export const closedOptionIds = (open: Set<string> | null, optionIds: string[]) =>
  optionIds.filter((id) => !isOptionOpen(open, id));

export const ALL_SIGNUP_OPTION_IDS = ["ohio", "phoenix", ...OHIO_CITY_IDS];

export const NOT_OPEN_MESSAGE = (labels: string[]) =>
  `${labels.join(" and ")} isn't open for sign-ups yet. We'll open it once the date is announced.`;
