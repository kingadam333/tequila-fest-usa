import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";
import { resend, FROM_SUPPORT } from "@/lib/resend";

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.type !== "email.received") {
    return NextResponse.json({ skipped: true });
  }

  const data = payload.data;
  const fromRaw: string = data?.from || "";
  const subject: string = data?.subject || "(no subject)";
  const to: string = Array.isArray(data?.to) ? data.to[0] : (data?.to || "");

  // Route by local-part to the right inbox label
  const toLower = to.toLowerCase();
  const inboxByPrefix: Record<string, string> = {
    "help@": "Support",
    "partners@": "Sponsors",
    "affiliates@": "Affiliates",
    "brands@": "Brands",
    "sponsors@": "Sponsors",
    "vendors@": "Vendors",
    "press@": "Press",
  };
  const matchedPrefix = Object.keys(inboxByPrefix).find((p) => toLower.includes(p));
  if (!matchedPrefix) {
    return NextResponse.json({ skipped: `unrouted recipient: ${to}` });
  }
  const inboxLabel = inboxByPrefix[matchedPrefix];

  // Resend's email.received webhook payload does NOT include the body.
  // Fetch it from the inbound retrieval endpoint: GET /emails/receiving/{id}
  // (The /emails/{id} endpoint is for SENT emails and 404s for inbound.)
  let fetchedText = "";
  let fetchedHtml = "";
  const emailId: string | undefined = data?.email_id || data?.id;
  if (emailId && process.env.RESEND_API_KEY) {
    try {
      const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (r.ok) {
        const body = await r.json();
        fetchedText = body?.text || "";
        fetchedHtml = body?.html || "";
      } else {
        console.error("Resend receiving fetch failed", r.status, await r.text());
      }
    } catch (err) {
      console.error("Resend receiving fetch threw", err);
    }
  }

  const rawBody = fetchedText || data?.text || fetchedHtml.replace(/<[^>]+>/g, " ") || data?.html?.replace(/<[^>]+>/g, " ") || "";
  const bodyFromPayload = rawBody
    .replace(/On .+wrote:[\s\S]*/i, "")
    .replace(/_{3,}[\s\S]*/g, "")
    .replace(/From:[\s\S]*/m, "")
    .trim();

  // Parse sender info
  const emailMatch = fromRaw.match(/<(.+?)>/);
  const email = emailMatch ? emailMatch[1] : fromRaw.trim();
  const name = fromRaw.includes("<")
    ? fromRaw.split("<")[0].trim().replace(/^"|"$/g, "")
    : email;

  // Use body if available, otherwise fall back to subject as the message
  // so the email still shows up in the inbox for manual review
  const message = bodyFromPayload || `[Email received — body not available]\nSubject: ${subject}`;
  const hasBody = !!bodyFromPayload;

  const db = supabaseAdmin as any;

  const { data: inserted } = await db.from("contact_submissions").insert({
    name,
    email,
    subject: subject.replace(/^(Re:\s*)+/i, "Re: ").trim(),
    message,
    status: "new",
    inbox: inboxLabel,
    phone: null,
  }).select("id").single();

  if (!inserted?.id) {
    console.error("DB insert failed for inbound email from", email);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  // Brands: skip AI entirely. Just notify Adam and mark for manual review.
  if (inboxLabel === "Brands") {
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `New brand email — ${subject}`,
        text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${hasBody ? bodyFromPayload : "[Body not captured by Resend]"}\n\n— Open in admin: https://www.tequilafestusa.com/admin`,
      });
      await db.from("contact_submissions").update({ status: "needs-review", ai_handled: false }).eq("id", inserted.id);
    } catch (err) {
      console.error("Failed to send brand notification:", err);
    }
    return NextResponse.json({ received: true, note: "brand — notified, no AI" });
  }

  if (!hasBody) {
    // No body — escalate directly so Adam can follow up
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `Open Ticket in Tequila Fest Inbox — ${subject}`,
        html: buildEscalationHtml(name, email, subject, `[Email body not captured by Resend — customer sent email with subject: "${subject}"]`, null),
      });
      await db.from("contact_submissions").update({ status: "needs-review", ai_handled: false }).eq("id", inserted.id);
    } catch (err) {
      console.error("Failed to send escalation for bodyless email:", err);
    }
    return NextResponse.json({ received: true, note: "no body — escalated" });
  }

  // Has body — run AI
  try {
    const { generateAIReply } = await import("@/lib/aiInbox");
    const { buildReplyHtml } = await import("@/lib/aiInboxEmail");

    const { data: orders } = await db
      .from("ticket_orders")
      .select("order_number, event_city, ticket_type, quantity, total, status, created_at")
      .ilike("customer_email", email)
      .eq("status", "paid")
      .limit(5);

    const orderInfo = orders?.length
      ? orders.map((o: any) =>
          `Order #${o.order_number}: ${o.event_city} – ${o.ticket_type} x${o.quantity} ($${o.total}) on ${o.created_at?.slice(0, 10)}`
        ).join("\n")
      : null;

    const result = await generateAIReply(name, email, subject, message, orderInfo);

    if (result.confident) {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: email,
        subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
        html: buildReplyHtml(name, result.reply),
      });
      await db.from("contact_submissions").update({
        status: "auto-replied",
        admin_reply: result.reply,
        replied_at: new Date().toISOString(),
        ai_handled: true,
      }).eq("id", inserted.id);
    } else {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `Open Ticket in Tequila Fest Inbox — ${subject}`,
        html: buildEscalationHtml(name, email, subject, message, orderInfo),
      });
      await db.from("contact_submissions").update({ status: "needs-review", ai_handled: false }).eq("id", inserted.id);
    }
  } catch (err) {
    console.error("AI inbox error on inbound email:", err);
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `Open Ticket in Tequila Fest Inbox — ${subject}`,
        html: buildEscalationHtml(name, email, subject, message, null),
      });
      await db.from("contact_submissions").update({ status: "needs-review", ai_handled: false }).eq("id", inserted.id);
    } catch {}
  }

  return NextResponse.json({ received: true });
}
