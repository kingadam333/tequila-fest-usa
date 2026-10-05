// Sponsor packages ("Become a Sponsor" on /brand-packages), stored in the
// sponsor_packages table and managed in admin -> Sponsors.

// Event options a package can be sold out for. Must match the ids in the
// brand packages page's EVENTS list.
export const SPONSOR_EVENT_OPTIONS = [
  { id: "ohio", label: "Ohio" },
  { id: "phoenix", label: "Phoenix" },
] as const;

const EVENT_IDS: string[] = SPONSOR_EVENT_OPTIONS.map((e) => e.id);

export type SponsorPackage = {
  id: string;
  name: string;
  price_per_event: number;
  blurb: string;
  features: string[];
  sold_events: string[];
  is_active: boolean;
  sort_order: number;
};

// Cleans an admin create/update body down to the writable columns. Returns an
// error string instead when a supplied field is invalid. With `partial`, only
// the fields present in the body are validated and returned.
export function parseSponsorPackageInput(
  body: unknown,
  { partial }: { partial: boolean },
): { ok: true; values: Partial<SponsorPackage> } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const values: Partial<SponsorPackage> = {};

  if (!partial || "name" in b) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) return { ok: false, error: "Name is required" };
    values.name = name;
  }
  if (!partial || "price_per_event" in b) {
    const price = Number(b.price_per_event);
    if (!Number.isInteger(price) || price < 0) return { ok: false, error: "Price must be a whole dollar amount" };
    values.price_per_event = price;
  }
  if ("blurb" in b) {
    values.blurb = typeof b.blurb === "string" ? b.blurb.trim() : "";
  }
  if ("features" in b) {
    if (!Array.isArray(b.features)) return { ok: false, error: "Features must be a list" };
    values.features = b.features.filter((f): f is string => typeof f === "string").map((f) => f.trim()).filter(Boolean);
  }
  if ("sold_events" in b) {
    if (!Array.isArray(b.sold_events) || b.sold_events.some((e) => typeof e !== "string" || !EVENT_IDS.includes(e))) {
      return { ok: false, error: `Sold events must be from: ${EVENT_IDS.join(", ")}` };
    }
    values.sold_events = [...new Set(b.sold_events as string[])];
  }
  if ("is_active" in b) {
    values.is_active = Boolean(b.is_active);
  }
  if ("sort_order" in b) {
    const order = Number(b.sort_order);
    if (!Number.isInteger(order)) return { ok: false, error: "Sort order must be a whole number" };
    values.sort_order = order;
  }
  return { ok: true, values };
}
