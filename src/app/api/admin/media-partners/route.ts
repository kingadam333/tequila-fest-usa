import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, generatePassword } from "@/lib/resend";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("media_partners")
    .select("*, media_partner_allocations(id, event_id, ticket_type, quota, issued_count, events(city, state, date, slug))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partners: data || [] });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { company_name, contact_name, email } = await req.json();
  if (!company_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "company_name and email are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const password = generatePassword();
  const password_hash = await bcrypt.hash(password, 10);
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await db
    .from("media_partners")
    .insert({
      company_name: company_name.trim(),
      contact_name: contact_name?.trim() || null,
      email: cleanEmail,
      password_hash,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: cleanEmail,
      subject: "Your Tequila Fest USA Media Partner Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:28px;margin-bottom:24px">
    <p style="font-size:22px;font-weight:900;color:#F5A623;margin:0 0 12px">Media Partner Account Created</p>
    <p style="color:rgba(255,248,240,0.65);line-height:1.6;margin:0 0 20px">
      Hi${contact_name ? ` ${contact_name.trim()}` : ""}, you can now log in to issue contest-winner tickets for <strong>${company_name.trim()}</strong>.
    </p>
    <table style="width:100%;font-size:14px;margin-bottom:20px">
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0;width:35%">Login URL</td><td style="color:#fff8f0">${appUrl}/media/login</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Email</td><td style="color:#fff8f0">${cleanEmail}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Password</td><td style="color:#F5A623;font-family:monospace;font-weight:700">${password}</td></tr>
    </table>
    <a href="${appUrl}/media/login" style="display:inline-block;background:#F5A623;color:#000;font-weight:900;font-size:14px;padding:14px 32px;border-radius:50px;text-decoration:none">LOG IN</a>
  </div>
  <p style="color:rgba(255,248,240,0.3);font-size:12px">Questions? Reply to this email.</p>
</div></body></html>`,
    });
  } catch (err) {
    console.error("Media partner welcome email error:", err);
  }

  return NextResponse.json({ partner: data });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("media_partners")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partner: data });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { error } = await db.from("media_partners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
