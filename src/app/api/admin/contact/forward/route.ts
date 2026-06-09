import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT, FROM_AFFILIATES, FROM_SPONSORS, FROM_VENDORS, FROM_BRANDS } from "@/lib/resend";

const INBOX_FROM: Record<string, string> = {
  Support:    FROM_SUPPORT,
  Vendors:    FROM_VENDORS,
  Sponsors:   FROM_SPONSORS,
  Affiliates: FROM_AFFILIATES,
  Brands:     FROM_BRANDS,
};

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { id, to, note, cc } = await req.json();
  if (!id || !to || !String(to).trim()) {
    return NextResponse.json({ error: "id and to required" }, { status: 400 });
  }
  const ccList: string[] = Array.isArray(cc)
    ? cc.map((e: any) => String(e).trim()).filter(Boolean)
    : typeof cc === "string"
      ? cc.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

  const db = supabaseAdmin as any;
  const { data: msg, error } = await db
    .from("contact_submissions")
    .select("name, email, subject, message, inbox, created_at")
    .eq("id", id)
    .single();
  if (error || !msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const fromEmail = INBOX_FROM[msg.inbox || "Support"] || FROM_SUPPORT;
  const noteHtml = note?.trim()
    ? `<div style="white-space:pre-wrap;color:#222;font-size:14px;line-height:1.5">${escape(note)}</div><hr style="border:none;border-top:1px solid #ddd;margin:18px 0">`
    : "";
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">
${noteHtml}
<div style="color:#666;font-size:13px;margin-bottom:8px">
<strong>---------- Forwarded message ----------</strong><br>
<strong>From:</strong> ${escape(msg.name || "")} &lt;${escape(msg.email || "")}&gt;<br>
<strong>Date:</strong> ${escape(new Date(msg.created_at).toLocaleString())}<br>
<strong>Subject:</strong> ${escape(msg.subject || "")}<br>
<strong>Inbox:</strong> ${escape(msg.inbox || "Support")}
</div>
<div style="white-space:pre-wrap;color:#222">${escape(msg.message || "")}</div>
</div>`;
  const text = `${note?.trim() ? note.trim() + "\n\n" : ""}---------- Forwarded message ----------\nFrom: ${msg.name} <${msg.email}>\nDate: ${new Date(msg.created_at).toLocaleString()}\nSubject: ${msg.subject}\nInbox: ${msg.inbox || "Support"}\n\n${msg.message || ""}`;

  try {
    const r = await resend.emails.send({
      from: fromEmail,
      to: String(to).split(",").map((s) => s.trim()).filter(Boolean),
      subject: `Fwd: ${(msg.subject || "").replace(/^(Fwd:\s*)+/i, "")}`,
      replyTo: msg.email || undefined,
      ...(ccList.length ? { cc: ccList } : {}),
      html,
      text,
    });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });

    // Log forward as an outbound entry on the thread so we can match
    // replies back to it via In-Reply-To.
    await db.from("contact_replies").insert({
      submission_id: id,
      direction: "outbound",
      sent_by: "admin",
      from_email: fromEmail.match(/<(.+?)>/)?.[1] || fromEmail,
      from_name: "Forwarded",
      body: `[Forwarded to ${String(to)}]${note?.trim() ? `\n\n${note.trim()}` : ""}`,
      provider_message_id: r.data?.id || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "send failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
