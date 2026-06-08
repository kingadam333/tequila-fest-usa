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

  // Only handle emails sent to help@
  if (!to.toLowerCase().includes("help@")) {
    return NextResponse.json({ skipped: "not a help@ email" });
  }

  // Try to get body from payload (data.text / data.html)
  // Resend inbound webhooks may or may not include body depending on domain config
  const rawBody = data?.text || data?.html?.replace(/<[^>]+>/g, " ") || "";
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
    inbox: "Support",
    phone: null,
  }).select("id").single();

  if (!inserted?.id) {
    console.error("DB insert failed for inbound email from", email);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
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
