import { NextRequest, NextResponse } from "next/server";
import { stripe, TICKET_PRICES, TICKET_LABELS, type TicketType } from "@/lib/stripe";
import { getEvent } from "@/lib/events";

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
