import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile } from "@/lib/turnstile";
import { automatedSubmissionReason, honeypotTripped, normalizeEmail, SPAM_REJECTION } from "@/lib/spamGuard";
import { resend, INBOX_ROUTING, FROM_SUPPORT } from "@/lib/resend";
import { generateAIReply } from "@/lib/aiInbox";
import { buildReplyHtml, buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";
import { lookupAccount, sendPasswordResetEmail, resendTicketEmail } from "@/lib/accountActions";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, subject, message, captchaToken } = body;

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Layered under Turnstile, which is verified and working but which this
  // spam run clears anyway — see src/lib/spamGuard.ts. Both checks are local,
  // so an obvious bot costs us no siteverify round-trip. The response is
  // deliberately vague and the reason is logged, not returned.
  if (honeypotTripped(body)) {
    console.warn("[contact] rejected: honeypot field filled", { email });
    return NextResponse.json(SPAM_REJECTION, { status: 400 });
  }
  const automated = automatedSubmissionReason({ name, email, message });
  if (automated) {
    console.warn(`[contact] rejected: ${automated}`, { email });
    return NextResponse.json(SPAM_REJECTION, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const routing = INBOX_ROUTING[subject] || { from: FROM_SUPPORT, to: "help@mail.tequilafestusa.com", label: "Support" };

  const db = supabaseAdmin as any;

  // Merge into a recent open thread for the same customer + inbox instead of
  // creating a parallel duplicate — mirrors the email-inbound webhook's
  // fallback. Without this, a customer re-submitting the contact form (e.g.
  // because an earlier auto-reply didn't solve their issue) fragmented the
  // same problem across many separate tickets.
  const mergeWindow = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  // Match on the NORMALIZED address, so one mailbox wearing many dotted Gmail
  // disguises merges into a single thread instead of N separate tickets. The
  // stored column holds whatever the sender typed, so the comparison can't be
  // done in SQL without a migration — the window is one inbox over 3 days, a
  // small enough set to normalize in memory.
  const normalizedEmail = normalizeEmail(email);
  const { data: windowSubmissions } = await db
    .from("contact_submissions")
    .select("id, email")
    .eq("inbox", routing.label)
    .gte("created_at", mergeWindow)
    .order("created_at", { ascending: false })
    .limit(200);
  const recentSubmission = (windowSubmissions || []).filter(
    (r: { email: string | null }) => normalizeEmail(r.email || "") === normalizedEmail,
  );

  let submissionId: string | undefined;
  if (recentSubmission?.length) {
    submissionId = recentSubmission[0].id;
    await db.from("contact_replies").insert({
      submission_id: submissionId,
      direction: "inbound",
      sent_by: "customer",
      from_email: email,
      from_name: name,
      body: message,
    });
  } else {
    const { data: inserted } = await db.from("contact_submissions").insert({
      name, email, phone: phone || null, subject, message, status: "new",
      inbox: routing.label,
    }).select("id").single();
    submissionId = inserted?.id;
  }

  if (routing.label === "Support" && submissionId) {
    // Run AI inline so Vercel doesn't kill it before it finishes
    try {
      // Look up order history for context — first by email, then by name as fallback
      const { data: orders } = await db
        .from("ticket_orders")
        .select("order_number, event_city, ticket_type, quantity, total, status, created_at, customer_email")
        .ilike("customer_email", email)
        .eq("status", "paid")
        .limit(5);

      let orderInfo: string | null = null;
      let emailMismatch = false;
      let matchedOrders: any[] = [];

      if (orders?.length) {
        matchedOrders = orders;
        orderInfo = orders.map((o: any) =>
          `Order #${o.order_number}: ${o.event_city} – ${o.ticket_type} x${o.quantity} ($${o.total}) on ${o.created_at?.slice(0, 10)}`
        ).join("\n");
      } else {
        // Fallback: search by customer name (catches email typos at checkout)
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const { data: nameOrders } = await db
          .from("ticket_orders")
          .select("order_number, event_city, ticket_type, quantity, total, status, created_at, customer_email")
          .ilike("customer_name", `%${name}%`)
          .eq("status", "paid")
          .limit(5);

        // Also try first+last separately if full name search returned nothing
        let combined = nameOrders || [];
        if (!combined.length && lastName) {
          const { data: lastNameOrders } = await db
            .from("ticket_orders")
            .select("order_number, event_city, ticket_type, quantity, total, status, created_at, customer_email")
            .ilike("customer_name", `%${lastName}%`)
            .eq("status", "paid")
            .limit(5);
          combined = lastNameOrders || [];
        }

        if (combined.length) {
          emailMismatch = true;
          matchedOrders = combined;
          orderInfo = combined.map((o: any) =>
            `Order #${o.order_number}: ${o.event_city} – ${o.ticket_type} x${o.quantity} ($${o.total}) on ${o.created_at?.slice(0, 10)} [NOTE: order email on file is ${o.customer_email} — may differ from contact email]`
          ).join("\n");
        }
      }

      const { hasAccount } = await lookupAccount(email);
      const result = await generateAIReply(name, email, subject, message, orderInfo, emailMismatch, hasAccount);

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
        }).eq("id", submissionId);

        await db.from("contact_replies").insert({
          submission_id: submissionId,
          direction: "outbound",
          sent_by: "ai",
          from_email: "help@mail.tequilafestusa.com",
          from_name: "AI Assistant",
          body: result.reply,
          provider_message_id: sendRes?.data?.id || null,
        });

        // Actually perform the action the AI decided on — not just tell the
        // customer to do it themselves. Resend only fires when exactly one
        // order matched, to avoid guessing which order they meant.
        if (result.action === "send_reset_link") {
          await sendPasswordResetEmail(email).catch(err => console.error("AI reset-link action failed:", err));
        } else if (result.action === "resend_tickets" && matchedOrders.length === 1) {
          await resendTicketEmail(matchedOrders[0].order_number).catch(err => console.error("AI resend-tickets action failed:", err));
        }
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
        }).eq("id", submissionId);
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
        await db.from("contact_submissions").update({ status: "needs-review", ai_handled: false }).eq("id", submissionId);
      } catch {}
    }
  } else {
    // Vendors / Sponsors / Affiliates / Brands — notify Adam directly.
    // We previously sent this notification to routing.to (e.g. vendors@,
    // affiliates@), but Resend's inbound MX then ingested the email and
    // created a duplicate contact_submissions row for every form submit.
    // The form already creates the inbox row, so this just needs to ping
    // Adam — reply-to is the customer so Adam can also just hit reply.
    try {
      await resend.emails.send({
        from: routing.from,
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `[${routing.label}] ${subject} — ${name}`,
        html: `
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message.replace(/\n/g, "<br>")}</p>
          <hr>
          <p style="color:#888;font-size:12px">This thread is in the ${routing.label} inbox at <a href="https://www.tequilafestusa.com/admin">admin</a>. You can also hit reply in this email to respond to ${name} directly.</p>
        `,
      });
    } catch (err) {
      console.error("Failed to send contact notification:", err);
    }
  }

  return NextResponse.json({ success: true });
}
