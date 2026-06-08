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

  console.log("Inbound webhook payload type:", payload.type, "keys:", Object.keys(payload));

  // Resend inbound webhook: type is "email.received"
  if (payload.type !== "email.received") {
    console.log("Skipping non email.received event:", payload.type);
    return NextResponse.json({ skipped: true });
  }

  const data = payload.data;
  const emailId: string = data?.email_id || data?.id;
  const fromRaw: string = data?.from || "";
  const subject: string = data?.subject || "(no subject)";
  const to: string = Array.isArray(data?.to) ? data.to[0] : (data?.to || "");

  console.log("Inbound email — from:", fromRaw, "to:", to, "subject:", subject, "emailId:", emailId);

  // Only handle emails sent to help@ — ignore other addresses on the domain
  if (!to.toLowerCase().includes("help@")) {
    console.log("Skipping — not a help@ email, to:", to);
    return NextResponse.json({ skipped: "not a help@ email" });
  }

  // Fetch the full email body from Resend API
  let message = "";
  try {
    console.log("Fetching email body for id:", emailId);
    const emailRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const emailData = await emailRes.json();
    console.log("Email API response status:", emailRes.status, "full keys:", Object.keys(emailData || {}));
    console.log("Email API raw (first 500):", JSON.stringify(emailData).slice(0, 500));
    const raw = emailData.text || emailData.html?.replace(/<[^>]+>/g, " ") || emailData.body || "";
    message = raw
      .replace(/On .+wrote:[\s\S]*/i, "")
      .replace(/_{3,}[\s\S]*/g, "")
      .replace(/From:[\s\S]*/m, "")
      .trim();
  } catch (err) {
    console.error("Failed to fetch email body:", err);
  }

  if (!message) {
    return NextResponse.json({ skipped: "empty body" });
  }

  // Parse "Name <email>" from address
  const emailMatch = fromRaw.match(/<(.+?)>/);
  const email = emailMatch ? emailMatch[1] : fromRaw.trim();
  const name = fromRaw.includes("<")
    ? fromRaw.split("<")[0].trim().replace(/^"|"$/g, "")
    : email;

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
    console.error("DB insert failed for inbound email from", email);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  // Run AI
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
