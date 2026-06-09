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

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Attach full reply thread per submission
  const submissions = data || [];
  const ids = submissions.map((s: any) => s.id);
  let replies: any[] = [];
  if (ids.length) {
    const { data: r } = await db
      .from("contact_replies")
      .select("id, submission_id, direction, sent_by, from_email, from_name, body, created_at")
      .in("submission_id", ids)
      .order("created_at", { ascending: true });
    replies = r || [];
  }
  const byId: Record<string, any[]> = {};
  for (const rep of replies) (byId[rep.submission_id] ||= []).push(rep);
  for (const s of submissions) s.replies = byId[s.id] || [];
  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { submissionId, replyTo, replyToName, subject, message, inbox } = await req.json();
  const fromEmail = INBOX_FROM[inbox || "Support"] || FROM_SUPPORT;

  if (!replyTo || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Send reply email
  try {
    await resend.emails.send({
      from: fromEmail,
      to: replyTo,
      subject: subject || `Re: Your message to Tequila Fest USA`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:28px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
          <p style="color:rgba(255,248,240,0.5);font-size:13px;margin:0 0 4px">Hi ${replyToName || "there"},</p>
          <div style="color:#fff8f0;font-size:15px;line-height:1.7;margin:12px 0 0;white-space:pre-wrap">${message.replace(/\n/g, "<br>")}</div>
        </td></tr>
        <tr><td style="height:24px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Tequila Fest USA · help@tequilafestusa.com · tequilafestusa.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Failed to send reply:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Update submission status + log reply in Supabase
  if (submissionId) {
    const db = supabaseAdmin as any;
    await db.from("contact_submissions").update({
      status: "replied",
      admin_reply: message, // kept for backward compat; full thread lives in contact_replies
      replied_at: new Date().toISOString(),
      ai_handled: false,
    }).eq("id", submissionId);

    await db.from("contact_replies").insert({
      submission_id: submissionId,
      direction: "outbound",
      sent_by: "admin",
      from_email: fromEmail.match(/<(.+?)>/)?.[1] || fromEmail,
      from_name: "Admin",
      body: message,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { error } = await db.from("contact_submissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
