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

  // Defensive: drop self-sent mail (from our own outbound aliases). Without
  // this, a notification email to vendors@/affiliates@/etc. would round-trip
  // through Resend's inbound MX and create a duplicate contact_submissions
  // row. The /api/contact route no longer self-mails, but this guard
  // prevents any future regression or stray loop.
  if (/@(mail\.)?tequilafestusa\.com/i.test(fromRaw)) {
    return NextResponse.json({ skipped: "self-sent mail (own-domain From)" });
  }

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
  // Only process emails addressed to our domain — ignore tastecleveland.net and any other domain
  if (!toLower.includes("tequilafestusa.com")) {
    return NextResponse.json({ skipped: `wrong domain: ${to}` });
  }

  const matchedPrefix = Object.keys(inboxByPrefix).find((p) => toLower.includes(p));
  if (!matchedPrefix) {
    return NextResponse.json({ skipped: `unrouted recipient: ${to}` });
  }
  const inboxLabel = inboxByPrefix[matchedPrefix];

  // Resend's email.received webhook payload does NOT include the body.
  // Fetch it from the inbound retrieval endpoint: GET /emails/receiving/{id}
  // (The /emails/{id} endpoint is for SENT emails and 404s for inbound.)
  // Resend can fire the webhook before the body is indexed, so retry once.
  let fetchedText = "";
  let fetchedHtml = "";
  let fetchedHeaders: Record<string, string> = {};
  const emailId: string | undefined = data?.email_id || data?.id;
  async function fetchReceivedOnce() {
    const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!r.ok) return { ok: false, status: r.status, msg: await r.text() };
    const body = await r.json();
    return {
      ok: true,
      text: (body?.text || "") as string,
      html: (body?.html || "") as string,
      headers: (body?.headers || {}) as Record<string, string>,
    };
  }
  if (emailId && process.env.RESEND_API_KEY) {
    try {
      let res = await fetchReceivedOnce();
      if (res.ok && !res.text && !res.html) res = { ok: false, status: 0, msg: "empty body" };
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetchReceivedOnce();
      }
      if (res.ok) {
        fetchedText = res.text || "";
        fetchedHtml = res.html || "";
        fetchedHeaders = res.headers || {};
      } else console.error("Resend receiving fetch failed", res.status, res.msg);
    } catch (err) {
      console.error("Resend receiving fetch threw", err);
    }
  }

  // HTML → plain text that preserves line breaks. Block-level tags become
  // newlines BEFORE we strip remaining tags, so signatures and paragraphs
  // keep their layout.
  function htmlToText(h: string) {
    return h
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<\s*li[^>]*>/gi, "• ")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  const rawBody =
    fetchedText ||
    data?.text ||
    (fetchedHtml ? htmlToText(fetchedHtml) : "") ||
    (data?.html ? htmlToText(data.html) : "") ||
    "";

  // Strip only quoted-reply blocks. Do NOT strip on "From:" — that chops
  // legitimate signatures (e.g. "From : adam@..." in contact info).
  const bodyFromPayload = rawBody
    .replace(/^On .+ wrote:[\s\S]*$/im, "")
    .replace(/^_{3,}[\s\S]*$/m, "")
    .replace(/^-{3,}\s*Original Message\s*-{3,}[\s\S]*$/im, "")
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

  // ─── Threading: is this a reply to one of our outbound emails? ───────────
  // We compare the In-Reply-To / References headers (case-insensitive lookup)
  // against the provider_message_id we stored on outbound contact_replies.
  // Resend's outbound id appears as a UUID inside the angle-bracketed
  // Message-ID, so we extract every <...> and every bare UUID and try to
  // match any of them. If matched, we APPEND to that thread instead of
  // creating a new submission.
  function pickHeader(h: Record<string, string>, name: string) {
    const lower = name.toLowerCase();
    for (const k of Object.keys(h || {})) if (k.toLowerCase() === lower) return h[k];
    return "";
  }
  const inReplyTo = pickHeader(fetchedHeaders, "in-reply-to");
  const references = pickHeader(fetchedHeaders, "references");
  const candidateTokens = `${inReplyTo} ${references}`
    .match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi) || [];

  let threadedSubmissionId: string | null = null;
  if (candidateTokens.length) {
    const { data: matched } = await db
      .from("contact_replies")
      .select("submission_id")
      .in("provider_message_id", candidateTokens)
      .order("created_at", { ascending: false })
      .limit(1);
    if (matched && matched.length) threadedSubmissionId = matched[0].submission_id;
  }

  if (threadedSubmissionId) {
    // Customer reply to an existing thread — append to contact_replies and
    // bump the parent submission to needs-review so it surfaces in admin.
    await db.from("contact_replies").insert({
      submission_id: threadedSubmissionId,
      direction: "inbound",
      sent_by: "customer",
      from_email: email,
      from_name: name,
      body: hasBody ? bodyFromPayload : `[Body not captured]\nSubject: ${subject}`,
    });
    await db.from("contact_submissions").update({
      status: "needs-review",
      ai_handled: false,
    }).eq("id", threadedSubmissionId);

    // Notify Adam there's a new customer reply on an existing thread (no AI)
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: ADMIN_EMAIL,
        subject: `Customer replied — ${subject}`,
        text: `${name} <${email}> replied on an existing thread.\n\n${hasBody ? bodyFromPayload : "[Body not captured]"}\n\n— Open in admin: https://www.tequilafestusa.com/admin`,
      });
    } catch (err) {
      console.error("Failed to send threaded-reply notification:", err);
    }
    return NextResponse.json({ received: true, note: "threaded into existing submission", submissionId: threadedSubmissionId });
  }

  // Not a reply we recognize — create a brand-new submission as before.
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
    const { lookupAccount, sendPasswordResetEmail, resendTicketEmail } = await import("@/lib/accountActions");

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
    const result = await generateAIReply(name, email, subject, message, orderInfo, undefined, hasAccount);

    if (result.confident) {
      const sendRes = await resend.emails.send({
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

      await db.from("contact_replies").insert({
        submission_id: inserted.id,
        direction: "outbound",
        sent_by: "ai",
        from_email: "help@mail.tequilafestusa.com",
        from_name: "AI Assistant",
        body: result.reply,
        provider_message_id: sendRes?.data?.id || null,
      });

      if (result.action === "send_reset_link") {
        await sendPasswordResetEmail(email).catch((err: any) => console.error("AI reset-link action failed:", err));
      } else if (result.action === "resend_tickets" && orders?.length === 1) {
        await resendTicketEmail(orders[0].order_number).catch((err: any) => console.error("AI resend-tickets action failed:", err));
      }
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
