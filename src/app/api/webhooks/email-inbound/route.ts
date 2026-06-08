import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateAIReply } from "@/lib/aiInbox";
import { buildReplyHtml, buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";
import { resend, FROM_SUPPORT } from "@/lib/resend";

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Resend inbound email schema
  const fromRaw: string = payload.from || "";
  const subject: string = payload.subject || "(no subject)";
  const text: string = payload.text || payload.html?.replace(/<[^>]+>/g, " ").trim() || "";

  // Parse "Name <email>" format
  const emailMatch = fromRaw.match(/<(.+?)>/);
  const email = emailMatch ? emailMatch[1] : fromRaw.trim();
  const name = fromRaw.includes("<") ? fromRaw.split("<")[0].trim().replace(/^"|"$/g, "") : email;

  if (!email || !text) {
    return NextResponse.json({ skipped: true });
  }

  // Strip quoted reply history (everything after "On ... wrote:" or "----")
  const message = text
    .replace(/On .+wrote:[\s\S]*/i, "")
    .replace(/_{3,}[\s\S]*/g, "")
    .replace(/From:[\s\S]*/m, "")
    .trim();

  if (!message) {
    return NextResponse.json({ skipped: "empty after stripping quotes" });
  }

  const db = supabaseAdmin as any;

  // Save to contact_submissions
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
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  // Run AI inline
  try {
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

      await db.from("contact_submissions").update({
        status: "needs-review",
        ai_handled: false,
      }).eq("id", inserted.id);
    }
  } catch (err) {
    console.error("AI inbox error on inbound email:", err);
    // Fallback: escalate so nothing is dropped
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
