// This route is kept as a manual trigger fallback only.
// Primary AI processing now runs inline in /api/contact to avoid Vercel cold-kill.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import { generateAIReply } from "@/lib/aiInbox";
import { buildReplyHtml, buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";
import { lookupAccount, sendPasswordResetEmail, resendTicketEmail } from "@/lib/accountActions";

export async function POST(req: NextRequest) {
  const { submissionId, name, email, subject, message } = await req.json();
  if (!submissionId || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = supabaseAdmin as any;

  // Brands inbox is human-only by policy — never let the AI auto-reply,
  // even via the manual-trigger button.
  const { data: sub } = await db
    .from("contact_submissions")
    .select("inbox")
    .eq("id", submissionId)
    .single();
  if (sub?.inbox === "Brands") {
    return NextResponse.json({ error: "AI auto-reply is disabled for Brands inbox — handle this thread manually." }, { status: 400 });
  }

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

  const { hasAccount } = await lookupAccount(email);

  let result;
  try {
    result = await generateAIReply(name, email, subject, message, orderInfo, undefined, hasAccount);
  } catch (err) {
    console.error("AI inbox error:", err);
    result = { confident: false, reply: "AI error", action: null };
  }

  if (result.confident) {
    let sentMessageId: string | null = null;
    try {
      const sendRes = await resend.emails.send({
        from: FROM_SUPPORT,
        to: email,
        subject: `Re: ${subject}`,
        html: buildReplyHtml(name, result.reply),
      });
      sentMessageId = sendRes?.data?.id || null;
    } catch (err) {
      console.error("Failed to send auto-reply:", err);
    }

    await db.from("contact_submissions").update({
      status: "auto-replied",
      admin_reply: result.reply,
      replied_at: new Date().toISOString(),
      ai_handled: true,
    }).eq("id", submissionId);

    await db.from("contact_replies").insert({
      submission_id: submissionId,
      direction: "outbound",
      sent_by: "ai",
      from_email: "help@mail.tequilafestusa.com",
      from_name: "AI Assistant",
      body: result.reply,
      provider_message_id: sentMessageId,
    });

    if (result.action === "send_reset_link") {
      await sendPasswordResetEmail(email).catch((err: any) => console.error("AI reset-link action failed:", err));
    } else if (result.action === "resend_tickets" && orders?.length === 1) {
      await resendTicketEmail(orders[0].order_number).catch((err: any) => console.error("AI resend-tickets action failed:", err));
    }

    return NextResponse.json({ handled: true, reply: result.reply });
  } else {
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `Open Ticket in Tequila Fest Inbox — ${subject}`,
        html: buildEscalationHtml(name, email, subject, message, orderInfo),
      });
    } catch (err) {
      console.error("Failed to send escalation email:", err);
    }

    await db.from("contact_submissions").update({
      status: "needs-review",
      ai_handled: false,
    }).eq("id", submissionId);

    return NextResponse.json({ handled: false, escalated: true });
  }
}
