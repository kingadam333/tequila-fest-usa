import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { getEvent } from "@/lib/events";

export interface AbandonedRecipient {
  email: string;
  name: string;
}

export interface AbandonedGroup {
  eventSlug: string;
  city: string;
  recipients: AbandonedRecipient[];
}

const LOOKBACK_DAYS = 45;

// Ticket checkouts that were started (a Stripe Checkout Session was created)
// but never completed — the session expired (Stripe's own 24h timeout) or is
// still sitting open well past a reasonable browsing window. Grouped by
// event so admin can send a per-city "you weren't charged, here's the link"
// nudge instead of a single blanket email.
export async function getAbandonedCheckoutGroups(): Promise<AbandonedGroup[]> {
  const sinceUnix = Math.floor((Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000);
  const staleOpenCutoff = Date.now() - 4 * 60 * 60 * 1000; // still "open" after 4h = effectively abandoned

  const byEvent = new Map<string, Map<string, AbandonedRecipient>>(); // eventSlug -> email -> recipient

  for await (const session of stripe.checkout.sessions.list({
    created: { gte: sinceUnix },
    limit: 100,
  })) {
    if (session.metadata?.type !== "ticket_purchase") continue;
    if (session.payment_status === "paid") continue;
    const isExpired = session.status === "expired";
    const isStaleOpen = session.status === "open" && session.created * 1000 < staleOpenCutoff;
    if (!isExpired && !isStaleOpen) continue;

    const eventSlug = session.metadata?.eventSlug;
    if (!eventSlug) continue;
    const email = (session.metadata?.customerEmail || session.customer_email || session.customer_details?.email || "").toLowerCase().trim();
    if (!email) continue;
    const name = session.metadata?.customerName || session.customer_details?.name || "";

    if (!byEvent.has(eventSlug)) byEvent.set(eventSlug, new Map());
    byEvent.get(eventSlug)!.set(email, { email, name });
  }

  if (byEvent.size === 0) return [];

  // Drop anyone who already has a completed order for that event — they
  // clearly did eventually check out, just on a different session.
  const db = supabaseAdmin as any;
  const { data: paidOrders } = await db
    .from("ticket_orders")
    .select("customer_email, event_slug")
    .eq("status", "paid");
  const paidSet = new Set((paidOrders || []).map((o: any) => `${o.event_slug}|${(o.customer_email || "").toLowerCase().trim()}`));

  const groups: AbandonedGroup[] = [];
  for (const [eventSlug, recipientsByEmail] of byEvent) {
    const event = getEvent(eventSlug);
    const recipients = Array.from(recipientsByEmail.values()).filter(r => !paidSet.has(`${eventSlug}|${r.email}`));
    if (recipients.length === 0) continue;
    groups.push({ eventSlug, city: event?.city || eventSlug, recipients });
  }
  return groups.sort((a, b) => b.recipients.length - a.recipients.length);
}

function recoveryEmailHtml(firstName: string, city: string, buyUrl: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="font-size:20px;font-weight:900;color:#F5A623;margin:0 0 12px">Your order wasn't completed</p>
    <p style="color:rgba(255,248,240,0.7);font-size:15px;line-height:1.7;margin:0 0 8px">
      Hi ${firstName}, looks like you started grabbing tickets to Tequila Fest ${city} but didn't finish checkout.
    </p>
    <p style="color:rgba(255,248,240,0.7);font-size:15px;line-height:1.7;margin:0 0 20px">
      <strong>You were not charged.</strong> If you still want in, tickets are going fast — grab yours below.
    </p>
    <div style="text-align:center">
      <a href="${buyUrl}" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:14px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:50px">Buy Tickets</a>
    </div>
  </div>
  <p style="color:rgba(255,248,240,0.25);font-size:12px;text-align:center;margin-top:24px">Questions? Email <a href="mailto:help@mail.tequilafestusa.com" style="color:#F5A623">help@mail.tequilafestusa.com</a></p>
</div></body></html>`;
}

export async function sendAbandonedCheckoutRecovery(eventSlug?: string): Promise<{ sent: number; failed: number; total: number; groups: number }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const groups = await getAbandonedCheckoutGroups();
  const targetGroups = eventSlug ? groups.filter(g => g.eventSlug === eventSlug) : groups;

  let sent = 0, failed = 0;
  for (const group of targetGroups) {
    const buyUrl = `${appUrl}/events/${group.eventSlug}`;
    for (const r of group.recipients) {
      const firstName = (r.name || "").split(" ")[0] || "there";
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: r.email,
          subject: `You're not signed up yet — Tequila Fest ${group.city}`,
          html: recoveryEmailHtml(firstName, group.city, buyUrl),
        });
        sent++;
      } catch {
        failed++;
      }
    }
  }

  const total = targetGroups.reduce((s, g) => s + g.recipients.length, 0);
  return { sent, failed, total, groups: targetGroups.length };
}
