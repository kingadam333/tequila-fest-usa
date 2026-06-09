import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile } from "@/lib/turnstile";
import { resend, INBOX_ROUTING, FROM_SUPPORT } from "@/lib/resend";
import { generateAIReply } from "@/lib/aiInbox";
import { buildReplyHtml, buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";

export async function POST(req: NextRequest) {
  const { name, email, phone, subject, message, captchaToken } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const routing = INBOX_ROUTING[subject] || { from: FROM_SUPPORT, to: "help@mail.tequilafestusa.com", label: "Support" };

  const db = supabaseAdmin as any;
  const { data: inserted } = await db.from("contact_submissions").insert({
    name, email, phone: phone || null, subject, message, status: "new",
    inbox: routing.label,
  }).select("id").single();

  if (routing.label === "Support" && inserted?.id) {
    // Run AI inline so Vercel doesn't kill it before it finishes
    try {
      // Look up order history for context
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
        const sendRes = await resend.emails.send({
          from: FROM_SUPPORT,
          to: email,
          subject: `Re: ${subject}`,
          html: buildReplyHtml(name, result.reply),
        });

        await db.from("contact_submissions").update({
          status: "auto-replied",
          admin_reply: result.reply,
          replied_at: new Date().toISOString(),
          ai_handled: true,
        }).eq("id", inserted.id);

        await db.from("contact_replies").insert({
          submission_id: inserted.id,
          direction: "outbound",
          sent_by: "ai",
          from_email: "help@mail.tequilafestusa.com",
          from_name: "AI Assistant",
          body: result.reply,
          provider_message_id: sendRes?.data?.id || null,
        });
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
      console.error("AI inbox error:", err);
      // Fallback: notify admin so nothing gets silently dropped
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
  } else {
    // Sponsors / Affiliates — notify the correct inbox directly
    try {
      await resend.emails.send({
        from: routing.from,
        to: routing.to,
        replyTo: email,
        subject: `[${routing.label}] ${subject} — ${name}`,
        html: `
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <hr>
          <p style="color:#888;font-size:12px">Reply directly to this email to respond to ${name}.</p>
        `,
      });
    } catch (err) {
      console.error("Failed to send contact notification:", err);
    }
  }

  return NextResponse.json({ success: true });
}
