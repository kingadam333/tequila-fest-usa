import { NextRequest, NextResponse } from "next/server";
import { stripe, TICKET_PRICES, TICKET_LABELS, type TicketType } from "@/lib/stripe";
import { getEvent } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase";
import { areTicketSalesClosed } from "@/lib/eventSales";

export interface CheckoutBody {
  eventSlug: string;
  ticketType: TicketType;
  quantity: number;
  customerEmail?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutBody = await req.json();
    const { eventSlug, ticketType, quantity, customerEmail } = body;

    if (!eventSlug || !ticketType || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = getEvent(eventSlug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Same past-event/closed-status guard as /api/pre-checkout. This endpoint
    // has no callers left in the app, but it is still publicly reachable and
    // creates real Stripe sessions, so it must not be the way around the
    // guard. See src/lib/eventSales.ts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `events`
    // is absent from the generated Database types, same as every other route
    // that queries it.
    const { data: eventRow } = await (supabaseAdmin as any)
      .from("events")
      .select("status, date_iso")
      .eq("slug", eventSlug)
      .maybeSingle();
    if (eventRow && areTicketSalesClosed(eventRow.status, eventRow.date_iso)) {
      return NextResponse.json(
        { error: "Tickets for this event are no longer on sale." },
        { status: 409 },
      );
    }

    const unitAmount = TICKET_PRICES[ticketType];
    if (!unitAmount) {
      return NextResponse.json({ error: "Invalid ticket type" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tequilafestusa.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: `${TICKET_LABELS[ticketType]} — Tequila Fest ${event.city} 2026`,
              description: `${event.date} · ${event.venue}, ${event.venueDetail}`,
              images: ["https://tequilafestusa.com/tequilafest_usa.png"],
            },
          },
          quantity,
        },
      ],
      customer_email: customerEmail,
      allow_promotion_codes: true,
      success_url: `${appUrl}/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}&event=${eventSlug}`,
      cancel_url: `${appUrl}/events/${eventSlug}`,
      metadata: {
        eventSlug,
        ticketType,
        quantity: String(quantity),
        eventCity: event.city,
        type: "ticket_purchase",
      },
      payment_intent_data: {
        description: `Tequila Fest ${event.city} 2026 — ${TICKET_LABELS[ticketType]} x${quantity}`,
        metadata: {
          eventSlug,
          ticketType,
        },
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
