import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  sponsorDb, depositFor, eventsLabel, eventsStillAvailable, payUrl, type SponsorReservation,
} from "@/lib/sponsorReservations";

type Action = "card_full" | "card_deposit" | "card_balance" | "zelle";

// Public, but scoped to one reservation by its unguessable pay_token (48 hex
// chars). Starts a Stripe Checkout for the right amount, or records that the
// sponsor chose Zelle. Card payments are confirmed by the Stripe webhook
// (metadata.type "sponsor"), never by this route.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { action } = ((await req.json().catch(() => ({}))) || {}) as { action?: Action };

  const db = sponsorDb();
  const { data } = await db.from("sponsor_reservations").select("*").eq("pay_token", token).maybeSingle();
  const r = data as SponsorReservation | null;
  if (!r) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });

  const firstPayment = action === "card_full" || action === "card_deposit" || action === "zelle";
  if (firstPayment && r.status !== "approved") {
    return NextResponse.json({ error: "This reservation isn't awaiting payment." }, { status: 409 });
  }
  if (action === "card_balance" && r.status !== "deposit_paid") {
    return NextResponse.json({ error: "There's no open balance on this reservation." }, { status: 409 });
  }
  if (firstPayment && !(await eventsStillAvailable(r))) {
    return NextResponse.json({ error: "Sorry — this sponsorship was just taken. Please contact sponsors@mail.tequilafestusa.com." }, { status: 409 });
  }

  if (action === "zelle") {
    const { error } = await db.from("sponsor_reservations")
      .update({ payment_method: "zelle", updated_at: new Date().toISOString() })
      .eq("id", r.id).eq("status", "approved");
    if (error) return NextResponse.json({ error: "Could not save your choice. Please try again." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  let kind: "full" | "deposit" | "balance";
  let amount: number;
  let label: string;
  if (action === "card_full") { kind = "full"; amount = r.total; label = "Sponsorship — paid in full"; }
  else if (action === "card_deposit") { kind = "deposit"; amount = depositFor(r.total); label = "Sponsorship — 10% deposit"; }
  else if (action === "card_balance") { kind = "balance"; amount = r.total - r.amount_paid; label = `Sponsorship — balance (invoice ${r.invoice_number})`; }
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  if (amount <= 0) return NextResponse.json({ error: "Nothing is owed on this reservation." }, { status: 409 });

  const description = `${r.company_name} — ${r.package_name} (${eventsLabel(r.events)})`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: r.contact_email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount * 100,
          product_data: { name: `${r.package_name} Sponsorship — ${eventsLabel(r.events)}`, description: label },
        },
      }],
      success_url: `${payUrl(r)}?paid=${kind}`,
      cancel_url: payUrl(r),
      payment_intent_data: { description: `${description} — ${label}` },
      // metadata.type must be set, or the shared webhook would treat this as a ticket order.
      metadata: { type: "sponsor", reservation_id: r.id, kind, amount: String(amount) },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[sponsor-pay] checkout create failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
