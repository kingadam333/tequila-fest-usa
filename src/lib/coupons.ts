// Ticket coupon codes (admin -> Coupons). Validated only on the server with the
// service role: anon has no access to the coupons table (see CLAUDE.md RLS
// section), and the discount is computed from the server's own ticket prices,
// never from prices the browser sends.
import type { SupabaseClient } from "@supabase/supabase-js";

export const COUPON_CITY_OPTIONS = [
  { id: "cleveland", label: "Cleveland" },
  { id: "cincinnati", label: "Cincinnati" },
  { id: "columbus", label: "Columbus" },
  { id: "phoenix", label: "Phoenix" },
] as const;
const CITY_IDS: string[] = COUPON_CITY_OPTIONS.map((c) => c.id);

export type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  uses: number;
  max_uses_per_customer: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applicable_cities: string[] | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export const normalizeCouponCode = (code: unknown) =>
  typeof code === "string" ? code.trim().toUpperCase().replace(/\s+/g, "") : "";

const round2 = (n: number) => Math.round(n * 100) / 100;
// ilike treats % and _ as wildcards; emails often contain "_".
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Dollar discount on the ticket subtotal (never on the service fee, never more than the tickets). */
export function couponDiscount(c: Pick<Coupon, "type" | "value" | "max_discount_amount">, ticketSubtotal: number): number {
  let d = c.type === "percentage" ? (ticketSubtotal * Number(c.value)) / 100 : Number(c.value);
  if (c.max_discount_amount != null) d = Math.min(d, Number(c.max_discount_amount));
  return round2(Math.max(0, Math.min(d, ticketSubtotal)));
}

export const describeCoupon = (c: Pick<Coupon, "type" | "value">) =>
  c.type === "percentage" ? `${Number(c.value)}% off tickets` : `$${Number(c.value).toFixed(2)} off tickets`;

type ValidateInput = { code: string; city: string; ticketSubtotal: number; email?: string };
export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number; label: string }
  | { ok: false; error: string };

/**
 * Checks a code against everything the coupon row restricts. `email` is
 * optional so the cart can preview a code before the buyer types it; the
 * per-customer limit is enforced again at checkout once the email is known.
 */
export async function validateCoupon(db: SupabaseClient, { code, city, ticketSubtotal, email }: ValidateInput): Promise<CouponCheck> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { ok: false, error: "Enter a promo code." };

  const { data, error } = await db.from("coupons").select("*").eq("code", normalized).maybeSingle();
  if (error) {
    console.error("[coupons] lookup failed:", error.message);
    return { ok: false, error: "Couldn't check that code right now. Please try again." };
  }
  const coupon = data as Coupon | null;
  const invalid = { ok: false as const, error: "That promo code isn't valid." };
  if (!coupon || !coupon.active) return invalid;
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return { ok: false, error: "That promo code has expired." };
  if (coupon.max_uses != null && coupon.uses >= coupon.max_uses) return { ok: false, error: "That promo code has been fully redeemed." };
  if (coupon.applicable_cities?.length && !coupon.applicable_cities.includes(city.toLowerCase())) {
    return { ok: false, error: "That promo code isn't valid for this event." };
  }
  if (coupon.min_order_amount != null && ticketSubtotal < Number(coupon.min_order_amount)) {
    return { ok: false, error: `That promo code needs at least $${Number(coupon.min_order_amount).toFixed(2)} in tickets.` };
  }

  if (email && coupon.max_uses_per_customer > 0) {
    const { count, error: countError } = await db
      .from("ticket_orders")
      .select("id", { count: "exact", head: true })
      .eq("coupon_code", coupon.code)
      .ilike("customer_email", escapeLike(email.trim()))
      .eq("status", "paid");
    if (countError) {
      console.error("[coupons] per-customer count failed:", countError.message);
      return { ok: false, error: "Couldn't check that code right now. Please try again." };
    }
    if ((count || 0) >= coupon.max_uses_per_customer) return { ok: false, error: "You've already used this promo code." };
  }

  const discount = couponDiscount(coupon, ticketSubtotal);
  if (discount <= 0) return invalid;
  return { ok: true, coupon, discount, label: describeCoupon(coupon) };
}

// Admin create/update body -> writable columns. With `partial`, only fields
// present are validated and returned.
export function parseCouponInput(
  body: unknown,
  { partial }: { partial: boolean },
): { ok: true; values: Partial<Coupon> } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const v: Partial<Coupon> = {};
  const optNum = (k: string, label: string, { int = false } = {}): number | null | string => {
    const raw = b[k];
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || (int && !Number.isInteger(n))) return `${label} must be ${int ? "a whole number" : "a number"} of 0 or more`;
    return n;
  };

  if (!partial || "code" in b) {
    const code = normalizeCouponCode(b.code);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: "Code must be 3–30 letters, numbers, - or _" };
    v.code = code;
  }
  if (!partial || "type" in b) {
    if (b.type !== "percentage" && b.type !== "fixed") return { ok: false, error: "Type must be percentage or fixed" };
    v.type = b.type;
  }
  if (!partial || "value" in b) {
    const n = Number(b.value);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Value must be more than 0" };
    const type = v.type ?? (b.type as string | undefined);
    if (type === "percentage" && n > 100) return { ok: false, error: "A percentage can't be over 100" };
    v.value = n;
  }
  for (const [k, label, int] of [
    ["max_uses", "Max uses", true],
    ["min_order_amount", "Minimum order", false],
    ["max_discount_amount", "Max discount", false],
  ] as const) {
    if (k in b) {
      const n = optNum(k, label, { int });
      if (typeof n === "string") return { ok: false, error: n };
      (v as Record<string, unknown>)[k] = n;
    }
  }
  if ("max_uses_per_customer" in b) {
    const n = Number(b.max_uses_per_customer);
    if (!Number.isInteger(n) || n < 0) return { ok: false, error: "Uses per customer must be a whole number (0 = unlimited)" };
    v.max_uses_per_customer = n;
  }
  if ("applicable_cities" in b) {
    const raw = b.applicable_cities;
    if (raw === null || (Array.isArray(raw) && raw.length === 0)) v.applicable_cities = null;
    else if (Array.isArray(raw) && raw.every((c) => typeof c === "string" && CITY_IDS.includes(c))) v.applicable_cities = [...new Set(raw as string[])];
    else return { ok: false, error: `Cities must be from: ${CITY_IDS.join(", ")}` };
  }
  if ("expires_at" in b) {
    const raw = b.expires_at;
    if (raw === null || raw === "") v.expires_at = null;
    // A bare date means "good through the end of that day" (Eastern), not midnight UTC.
    else if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) v.expires_at = new Date(`${raw}T23:59:59-05:00`).toISOString();
    else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) v.expires_at = new Date(raw).toISOString();
    else return { ok: false, error: "Expiry must be a date" };
  }
  if ("active" in b) v.active = Boolean(b.active);
  return { ok: true, values: v };
}
