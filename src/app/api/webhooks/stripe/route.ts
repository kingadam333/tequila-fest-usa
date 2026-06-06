import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resend, FROM_EMAIL, ticketConfirmationHtml } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";
import type Stripe from "stripe";

// Stripe requires the raw body — disable body parsing

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", intent.id, intent.last_payment_error?.message);
        // TODO: update order status to failed in DB
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("Charge refunded:", charge.id);
        // TODO: update order status to refunded in DB
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { eventSlug, ticketType, quantity, eventCity } = session.metadata || {};
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerName = session.customer_details?.name || "Guest";
  const firstName = customerName.split(" ")[0] || "there";
  const amountTotal = (session.amount_total || 0) / 100;
  const qty = parseInt(quantity || "1");
  const orderNumber = session.id.slice(-8).toUpperCase();

  console.log("✅ Payment completed:", { sessionId: session.id, customerEmail, eventSlug, ticketType, qty, amountTotal });

  // Send confirmation email via Resend
  if (customerEmail) {
    try {
      const event = eventSlug ? getEvent(eventSlug) : null;
      const ticketLabel = TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS] || ticketType || "All Inclusive";

      await resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `🥃 You're in! Tequila Fest ${eventCity || ""} — Order Confirmed`,
        html: ticketConfirmationHtml({
          firstName,
          eventCity: eventCity || "USA",
          eventDate: event?.date || "2026",
          eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
          ticketType: ticketLabel,
          quantity: qty,
          total: amountTotal,
          orderNumber,
        }),
      });
      console.log("✉️ Confirmation email sent to", customerEmail);
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
    }
  }

  // TODO: when Railway backend is live:
  // 1. POST to backend to create ticketOrder + ticketInstances in DB
  // 2. Generate QR codes and send ticket email
  // 3. Create/link customerAccount
  // 4. Add to Brevo marketing list
}
