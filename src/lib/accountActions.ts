import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, passwordResetHtml, qrTicketHtml } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";
import crypto from "crypto";

// Shared by the public /api/auth/forgot-password route AND the AI inbox
// (so a confident AI reply can actually trigger a real reset email, not
// just tell the customer to go click a link themselves).
export async function sendPasswordResetEmail(email: string): Promise<{ sent: boolean; reason?: string }> {
  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();

  const { data: account } = await db.from("customer_accounts").select("id").eq("email", cleanEmail).single();
  if (!account) return { sent: false, reason: "no_account" };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.from("password_reset_tokens").delete().eq("email", cleanEmail);
  await db.from("password_reset_tokens").insert({ token, email: cleanEmail, expires_at: expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: cleanEmail,
      subject: "Reset your Tequila Fest USA password",
      html: passwordResetHtml({ resetUrl }),
    });
    return { sent: true };
  } catch (err) {
    console.error("sendPasswordResetEmail error:", err);
    return { sent: false, reason: "send_failed" };
  }
}

// Shared by admin's manual "resend ticket email" button AND the AI inbox.
export async function resendTicketEmail(orderNumber: string): Promise<{ sent: boolean; reason?: string }> {
  const db = supabaseAdmin as any;

  const { data: order } = await db.from("ticket_orders").select("*").eq("order_number", orderNumber).single();
  if (!order) return { sent: false, reason: "order_not_found" };

  const { data: instances } = await db
    .from("ticket_instances")
    .select("*")
    .eq("order_id", order.id)
    .order("ticket_number", { ascending: true });

  const event = getEvent(order.event_slug);
  const firstName = (order.customer_name || "Guest").split(" ")[0];
  const ticketLabel = TICKET_LABELS[order.ticket_type as keyof typeof TICKET_LABELS] || order.ticket_type || "All Inclusive";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";

  const ticketInstances = (instances || []).map((t: any, i: number) => ({
    qrCode: t.qr_code,
    ticketNumber: t.ticket_number || i + 1,
    totalInOrder: order.quantity,
    holderName: t.holder_name || order.customer_name,
    ticketType: ticketLabel,
  }));

  if (ticketInstances.length === 0) {
    for (let i = 0; i < order.quantity; i++) {
      ticketInstances.push({
        qrCode: `TKT-${order.id.slice(-8).toUpperCase()}-${String(i + 1).padStart(3, "0")}-RESENT`,
        ticketNumber: i + 1,
        totalInOrder: order.quantity,
        holderName: order.customer_name,
        ticketType: ticketLabel,
      });
    }
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `🎟️ Your Tequila Fest ${order.event_city} Tickets — ${order.order_number}`,
      html: qrTicketHtml({
        firstName,
        eventCity: order.event_city,
        eventDate: event?.date || "2026",
        eventTime: event?.time || "3:00 PM – 9:00 PM",
        eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
        orderNumber: order.order_number,
        tickets: ticketInstances,
        appUrl,
        total: Number(order.total),
        ticketType: ticketLabel,
        quantity: order.quantity,
      }),
    });
    return { sent: true };
  } catch (err) {
    console.error("resendTicketEmail error:", err);
    return { sent: false, reason: "send_failed" };
  }
}

// Looks up whether an email has a registered account — used to give the AI
// accurate context (sign-up vs. forgot-password wording) instead of guessing.
export async function lookupAccount(email: string): Promise<{ hasAccount: boolean; loyaltyPoints?: number }> {
  const db = supabaseAdmin as any;
  const { data } = await db
    .from("customer_accounts")
    .select("id, loyalty_points")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data ? { hasAccount: true, loyaltyPoints: data.loyalty_points } : { hasAccount: false };
}
