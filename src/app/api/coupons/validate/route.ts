import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { getEvent } from "@/lib/events";
import { TICKET_PRICES, type TicketType } from "@/lib/ticket-config";
import { validateCoupon } from "@/lib/coupons";

// Public: lets the ticket cart preview a promo code. Purely advisory: the
// discount is recomputed and re-validated in /api/pre-checkout, which is what
// actually sets the Stripe price. Prices come from TICKET_PRICES, not the client.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const event = typeof body?.eventSlug === "string" ? getEvent(body.eventSlug) : null;
  if (!body || !event) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });

  const items = Array.isArray(body.items) ? (body.items as { ticketType?: string; quantity?: unknown }[]) : [];
  const ticketSubtotal = items.reduce((sum, i) => {
    const cents = TICKET_PRICES[i.ticketType as TicketType];
    const qty = Math.max(0, Math.min(10, Math.floor(Number(i.quantity) || 0)));
    return cents ? sum + (cents / 100) * qty : sum;
  }, 0);
  if (ticketSubtotal <= 0) return NextResponse.json({ ok: false, error: "Add tickets first." }, { status: 400 });

  const result = await validateCoupon(supabaseAdmin as unknown as SupabaseClient, {
    code: String(body.code || ""),
    city: event.city,
    ticketSubtotal,
    email: typeof body.email === "string" && body.email.includes("@") ? body.email : undefined,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error });
  return NextResponse.json({ ok: true, code: result.coupon.code, discount: result.discount, label: result.label });
}
