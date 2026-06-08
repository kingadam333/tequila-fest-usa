import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resend, FROM_EMAIL, generatePassword, qrTicketHtml } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";
import type Stripe from "stripe";
import crypto from "crypto";

// Disable body parsing — Stripe needs raw body for signature verification
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
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("Charge refunded:", charge.id);
        await handleRefund(charge);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { eventSlug, ticketType, quantity, eventCity, customerName: metaName, customerPhone } = session.metadata || {};
  const customerEmail = session.customer_email || session.customer_details?.email || "";
  const customerName = metaName || session.customer_details?.name || "Guest";
  const firstName = customerName.split(" ")[0] || "there";
  const amountTotal = (session.amount_total || 0) / 100;
  const qty = parseInt(quantity || "1");
  const orderNumber = session.metadata?.orderNumber || `TF-${new Date().getFullYear()}-${session.id.slice(-6).toUpperCase()}`;

  console.log("✅ Payment completed:", { sessionId: session.id, customerEmail, eventSlug, ticketType, qty, amountTotal });

  // 1. Write order to Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const event = eventSlug ? getEvent(eventSlug) : null;

      // Create order record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;
      const orderPayload = {
        order_number: orderNumber,
        customer_email: customerEmail,
        customer_name: customerName,
        event_slug: eventSlug || "",
        event_city: eventCity || event?.city || "",
        ticket_type: ticketType || "",
        quantity: qty,
        unit_price: amountTotal / qty,
        subtotal: amountTotal,
        discount_amount: 0,
        total: amountTotal,
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: "paid",
      };
      const { data: order, error: orderError } = await db
        .from("ticket_orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) {
        console.error("Supabase order insert error:", orderError);
      } else if (order) {
        // Create individual ticket instances with QR codes
        const tickets = Array.from({ length: qty }, (_, i) => ({
          order_id: order.id,
          ticket_number: i + 1,
          event_slug: eventSlug || "",
          event_city: eventCity || event?.city || "",
          ticket_type: ticketType || "",
          holder_name: i === 0 ? customerName : "Guest",
          qr_code: `TKT-${order.id.slice(-8).toUpperCase()}-${String(i + 1).padStart(3, "0")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          status: "valid" as const,
        }));

        const { error: ticketError } = await db.from("ticket_instances").insert(tickets);
        if (ticketError) console.error("Ticket instances error:", ticketError);

        // ── Award purchase points ──────────────────────────────────
        // GA Entry: 1 point/ticket, no raffle. All other types: 5 points/ticket + raffle eligible.
        if (customerEmail) {
          try {
            const isGA = ticketType === "ga";
            const pointsPerTicket = isGA ? 10 : 100;
            const purchasePoints = qty * pointsPerTicket;

            const { data: buyer } = await db
              .from("customer_accounts")
              .select("id, loyalty_points")
              .eq("email", customerEmail.toLowerCase())
              .single();

            if (buyer) {
              await db.from("customer_accounts")
                .update({ loyalty_points: (buyer.loyalty_points || 0) + purchasePoints })
                .eq("id", buyer.id);

              await db.from("loyalty_transactions").insert({
                customer_id: buyer.id,
                action_code: "ticket_purchase",
                points: purchasePoints,
                description: `Purchased ${qty} ${isGA ? "GA Entry" : "All Inclusive"} ticket${qty > 1 ? "s" : ""} to Tequila Fest ${eventCity}`,
                source_id: order.id,
                source_type: "order",
              });
              console.log(`⭐ Awarded ${purchasePoints} points to ${customerEmail} (${isGA ? "GA: 1pt/ticket" : "All Inclusive: 5pts/ticket"})`);
            }
          } catch (pointsErr) {
            console.error("Points award error:", pointsErr);
          }
        }

        // ── Auto-create Supabase Auth account ─────────────────────
        let newAccountPassword: string | null = null;
        if (customerEmail) {
          try {
            const { createClient } = await import("@supabase/supabase-js");
            const adminAuth = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );

            // Check if auth user already exists by email lookup (not listUsers which is paginated/slow)
            const { data: existingAccount } = await db
              .from("customer_accounts")
              .select("id")
              .eq("email", customerEmail)
              .maybeSingle();

            if (!existingAccount) {
              const password = generatePassword();
              newAccountPassword = password;
              const nameParts = customerName.split(" ");
              const { data: authUser, error: authErr } = await adminAuth.auth.admin.createUser({
                email: customerEmail,
                password,
                email_confirm: true,
                user_metadata: {
                  first_name: nameParts[0] || firstName,
                  last_name: nameParts.slice(1).join(" ") || "",
                  phone: customerPhone || "",
                },
              });

              if (!authErr && authUser?.user) {
                await db.from("customer_accounts").upsert({
                  id: authUser.user.id,
                  email: customerEmail,
                  first_name: nameParts[0] || firstName,
                  last_name: nameParts.slice(1).join(" ") || null,
                  phone: customerPhone || null,
                }, { onConflict: "email" });
                console.log(`🔑 Account created for ${customerEmail}`);
              } else if (authErr) {
                console.error("Auth createUser error:", authErr);
                newAccountPassword = null;
              }
            } else {
              console.log(`👤 Account already exists for ${customerEmail}`);
            }
          } catch (authErr) {
            console.error("Auth account creation error:", authErr);
          }
        }

        // ── Send single ticket email with QR codes ─────────────────
        if (customerEmail) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
            const ticketInstances = tickets.map((t: { qr_code: string; ticket_number: number; holder_name: string }, i: number) => ({
              qrCode: t.qr_code,
              ticketNumber: t.ticket_number || i + 1,
              totalInOrder: qty,
              holderName: t.holder_name || customerName,
              ticketType: ticketType ? (TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS] || ticketType) : "All Inclusive",
            }));
            const ticketLabel = TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS] || ticketType || "All Inclusive";

            const emailResult = await resend.emails.send({
              from: FROM_EMAIL,
              to: customerEmail,
              subject: `🎟️ Your Tequila Fest ${eventCity || event?.city} Tickets — ${orderNumber}`,
              html: qrTicketHtml({
                firstName,
                eventCity: eventCity || event?.city || "USA",
                eventDate: event?.date || "2026",
                eventTime: event?.time || "3:00 PM – 9:00 PM",
                eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
                orderNumber,
                tickets: ticketInstances,
                appUrl,
                total: amountTotal,
                ticketType: ticketLabel,
                quantity: qty,
                newPassword: newAccountPassword || undefined,
              }),
            });
            console.log("🎟️ Ticket email sent:", JSON.stringify(emailResult));
          } catch (emailErr: any) {
            console.error("Failed to send ticket email:", emailErr?.message || emailErr);
          }
        }

        // ── Award referral points ──────────────────────────────────
        const refCode = session.metadata?.refCode;
        if (refCode) {
          try {
            const { data: refCodeRow } = await db
              .from("referral_codes")
              .select("customer_id")
              .eq("code", refCode)
              .single();

            if (refCodeRow && refCodeRow.customer_id !== order.customer_id) {
              const isGA = ticketType === "ga";
              const POINTS = isGA ? 20 : 100;
              const ENTRIES = isGA ? 0 : 1; // GA referrals: points only, no raffle entry

              // Log the referral conversion
              await db.from("referrals").upsert({
                referral_code: refCode,
                referrer_customer_id: refCodeRow.customer_id,
                referred_email: customerEmail,
                referred_order_id: order.id,
                status: "converted",
                points_awarded: POINTS,
                raffle_entries: ENTRIES,
              }, { onConflict: "referred_order_id" });

              // Add points to referrer's account
              await db.from("customer_accounts")
                .update({ loyalty_points: db.raw(`loyalty_points + ${POINTS}`) })
                .eq("id", refCodeRow.customer_id);

              // Log the transaction
              await db.from("loyalty_transactions").insert({
                customer_id: refCodeRow.customer_id,
                action_code: "referral_conversion",
                points: POINTS,
                description: `Referral: ${customerEmail} bought a ticket to Tequila Fest ${eventCity}`,
                source_id: order.id,
                source_type: "referral",
              });

              console.log(`🎯 Referral awarded: ${POINTS} pts to ${refCodeRow.customer_id} for code ${refCode}`);
            }
          } catch (refErr) {
            console.error("Referral award error:", refErr);
          }
        }

        console.log(`📋 Order ${orderNumber} saved to Supabase with ${qty} ticket(s)`);
      }
    } catch (dbErr) {
      console.error("Supabase write error:", dbErr);
    }
  }
}

async function handleRefund(charge: Stripe.Charge) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (paymentIntentId) {
      await db.from("ticket_orders").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("stripe_payment_intent_id", paymentIntentId);
      const { data: ord } = await db.from("ticket_orders").select("id").eq("stripe_payment_intent_id", paymentIntentId).single();
      if (ord?.id) await db.from("ticket_instances").update({ status: "refunded" }).eq("order_id", ord.id);
    }
  } catch (err) {
    console.error("Refund update error:", err);
  }
}
