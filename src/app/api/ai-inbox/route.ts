// This route is kept as a manual trigger fallback only.
// Primary AI processing now runs inline in /api/contact to avoid Vercel cold-kill.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import { generateAIReply } from "@/lib/aiInbox";
import { buildReplyHtml, buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";

export async function POST(req: NextRequest) {
  const { submissionId, name, email, subject, message } = await req.json();
  if (!submissionId || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = supabaseAdmin as any;

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

  let result;
  try {
    result = await generateAIReply(name, email, subject, message, orderInfo);
  } catch (err) {
    console.error("AI inbox error:", err);
    result = { confident: false, reply: "AI error", action: null };
  }

  if (result.confident) {
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: email,
        subject: `Re: ${subject}`,
        html: buildReplyHtml(name, result.reply),
      });
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
    });

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
