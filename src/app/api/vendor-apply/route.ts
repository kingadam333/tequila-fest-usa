import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT, FROM_VENDORS } from "@/lib/resend";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  const { name, business, email, phone, type, cities, description, captchaToken } = await req.json();

  if (!name?.trim() || !business?.trim() || !email?.trim() || !type?.trim()) {
    return NextResponse.json({ error: "Name, business, email, and vendor type are required" }, { status: 400 });
  }

  // Turnstile verification — always enforced (verifyTurnstile self-skips in dev when no secret is set)
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Scrub duplicate submissions by email — a rejected prior application
  // doesn't block reapplying, but a pending/approved one does. Don't create
  // a second row; just let the applicant know they've already applied.
  const { data: existing } = await db
    .from("vendor_applications")
    .select("id, status")
    .eq("email", email.trim().toLowerCase())
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ duplicate: true, existingStatus: existing.status }, { status: 409 });
  }

  const { data, error } = await db.from("vendor_applications").insert({
    name: name.trim(),
    business_name: business.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    vendor_type: type,
    cities: Array.isArray(cities) ? cities : cities ? [cities] : [],
    description: description?.trim() || null,
    status: "pending",
  }).select().single();

  if (error) {
    console.error("Vendor application error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }

  // Send confirmation to applicant
  resend.emails.send({
    from: FROM_VENDORS,
    to: email.trim(),
    subject: "Vendor Application Received — Tequila Fest USA",
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:28px;margin-bottom:20px">
    <p style="font-size:22px;font-weight:900;color:#F5A623;margin:0 0 8px">Application Received! 🎉</p>
    <p style="color:rgba(255,248,240,0.65);margin:0;line-height:1.6">
      Hi ${name.trim()}, we've received your vendor application for <strong>${business.trim()}</strong>.
      Our team will review it and get back to you within 3–5 business days.
    </p>
  </div>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:20px">
    <p style="font-size:11px;font-weight:700;letter-spacing:3px;color:#F5A623;margin:0 0 12px">YOUR APPLICATION</p>
    <table style="width:100%;font-size:14px">
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Business</td><td style="color:#fff8f0;font-weight:600">${business.trim()}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Type</td><td style="color:#fff8f0">${type}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Cities</td><td style="color:#fff8f0">${Array.isArray(cities) ? cities.join(", ") : cities || "TBD"}</td></tr>
    </table>
  </div>
  <p style="color:rgba(255,248,240,0.3);font-size:12px;margin:0">Questions? Email <a href="mailto:vendors@mail.tequilafestusa.com" style="color:#F5A623">vendors@mail.tequilafestusa.com</a></p>
</div></body></html>`,
  }).catch(() => {});

  // Notify admin
  resend.emails.send({
    from: FROM_SUPPORT,
    to: "partners@mail.tequilafestusa.com",
    subject: `New Vendor Application — ${business.trim()}`,
    html: `<p>New vendor application from <strong>${name.trim()}</strong> (${email}) for <strong>${business.trim()}</strong>.<br>Type: ${type} | Cities: ${Array.isArray(cities) ? cities.join(", ") : cities}<br><br>Review in the <a href="https://tequilafestusa.com/admin">admin dashboard</a>.</p>`,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
