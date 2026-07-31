import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, generatePassword } from "@/lib/resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Every affiliate + their live-computed performance, never trusting the
// affiliates.total_clicks/total_referrals/total_earnings columns (same
// "always recompute live" rule this project uses for ticket sold-counts —
// those columns exist in the schema but are intentionally left unused).
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  const { data: affiliates, error } = await db
    .from("affiliates")
    .select("id, email, first_name, last_name, phone, referral_code, commission_rate, status, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!affiliates?.length) return NextResponse.json({ affiliates: [] });

  const ids = affiliates.map((a: any) => a.id);

  const { data: links } = await db.from("short_links").select("id, slug, affiliate_id, clicks").in("affiliate_id", ids);
  const linkByAffiliate = new Map<string, { id: string; slug: string; affiliate_id: string; clicks: number }>(
    (links || []).map((l: any) => [l.affiliate_id, l])
  );

  const { data: conversions } = await db
    .from("affiliate_conversions")
    .select("affiliate_id, event_city, quantity, sale_amount, commission_amount")
    .in("affiliate_id", ids);

  const { data: payouts } = await db.from("affiliate_payouts").select("affiliate_id, amount").in("affiliate_id", ids);

  const result = affiliates.map((a: any) => {
    const link = linkByAffiliate.get(a.id) || null;
    const convs = (conversions || []).filter((c: any) => c.affiliate_id === a.id);
    const byCity: Record<string, { orders: number; tickets: number; sales: number; commission: number }> = {};
    let totalSales = 0, totalCommission = 0, totalTickets = 0;
    for (const c of convs) {
      const bucket = (byCity[c.event_city] ||= { orders: 0, tickets: 0, sales: 0, commission: 0 });
      bucket.orders += 1;
      bucket.tickets += c.quantity || 0;
      bucket.sales += Number(c.sale_amount) || 0;
      bucket.commission += Number(c.commission_amount) || 0;
      totalSales += Number(c.sale_amount) || 0;
      totalCommission += Number(c.commission_amount) || 0;
      totalTickets += c.quantity || 0;
    }
    const totalPaid = (payouts || []).filter((p: any) => p.affiliate_id === a.id).reduce((s: number, p: any) => s + Number(p.amount), 0);

    return {
      ...a,
      // Stored in the DB as a fraction (numeric(4,3) — e.g. 0.100 for 10%,
      // max ~9.999 which is why a whole percent like "10" overflows it)
      // but the API's public contract is a whole percent, matching the UI.
      commission_rate: Number(a.commission_rate) * 100,
      slug: link?.slug || null,
      clicks: link?.clicks || 0,
      orders: convs.length,
      tickets: totalTickets,
      totalSales,
      totalCommission,
      totalPaid,
      balanceOwed: totalCommission - totalPaid,
      byCity,
    };
  });

  return NextResponse.json({ affiliates: result });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { firstName, lastName, email, phone, commissionRate } = await req.json();

  if (!firstName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "firstName and email are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();

  const { data: existing } = await db.from("affiliates").select("id").ilike("email", cleanEmail).maybeSingle();
  if (existing) return NextResponse.json({ error: "An affiliate with this email already exists" }, { status: 409 });

  const password = generatePassword();
  const password_hash = await bcrypt.hash(password, 10);

  const baseSlug = slugify(`${firstName}-${lastName || ""}`) || "affiliate";
  let referralCode = baseSlug;
  const { data: codeTaken } = await db.from("affiliates").select("id").eq("referral_code", referralCode).maybeSingle();
  if (codeTaken) referralCode = `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`;

  const { data: affiliate, error } = await db
    .from("affiliates")
    .insert({
      email: cleanEmail,
      password_hash,
      first_name: firstName.trim(),
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      referral_code: referralCode,
      // Stored as a fraction — see the numeric(4,3) note in GET above.
      commission_rate: (commissionRate ?? 10) / 100,
      status: "active",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Their dedicated short link + QR code — reuses the existing short-links
  // infrastructure (click logging, QR image) rather than building a second
  // system. /go/[slug] recognizes affiliate_id and sets the attribution
  // cookie before redirecting.
  let slug = referralCode;
  const { data: slugTaken } = await db.from("short_links").select("id").eq("slug", slug).maybeSingle();
  if (slugTaken) slug = `${referralCode}-${crypto.randomBytes(2).toString("hex")}`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";
  const { error: linkError } = await db.from("short_links").insert({
    slug,
    destination_url: siteUrl,
    label: `${firstName.trim()}${lastName ? ` ${lastName.trim()}` : ""} — Affiliate`,
    affiliate_id: affiliate.id,
  });
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  const loginUrl = `${siteUrl}/affiliate/login`;
  const refLink = `${siteUrl}/go/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(refLink)}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: cleanEmail,
      subject: "Your Tequila Fest USA Affiliate Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:28px;margin-bottom:24px">
    <p style="font-size:22px;font-weight:900;color:#F5A623;margin:0 0 12px">Welcome to the Affiliate Program!</p>
    <p style="color:rgba(255,248,240,0.65);line-height:1.6;margin:0 0 20px">
      Hi ${firstName.trim()}, you're set up to earn ${commissionRate ?? 10}% commission on every ticket sale you refer.
    </p>
    <table style="width:100%;font-size:14px;margin-bottom:20px">
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0;width:35%">Login URL</td><td style="color:#fff8f0">${loginUrl}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Email</td><td style="color:#fff8f0">${cleanEmail}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Password</td><td style="color:#fff8f0;font-family:monospace">${password}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.4);padding:4px 0">Your Link</td><td style="color:#F5A623">${refLink}</td></tr>
    </table>
    <p style="text-align:center;margin:0 0 8px"><img src="${qrUrl}" width="180" height="180" alt="Your QR code" style="border-radius:8px;border:2px solid #fff" /></p>
    <p style="color:rgba(255,248,240,0.4);font-size:12px;text-align:center;margin:0">Share your link or QR code anywhere — every ticket sale through it is tracked automatically.</p>
  </div>
</div></body></html>`,
    });
  } catch (err) {
    console.error("Failed to send affiliate welcome email:", err);
  }

  return NextResponse.json({ affiliate, slug, refLink });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id, status, commissionRate } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  // Stored as a fraction — see the numeric(4,3) note in GET above.
  if (commissionRate !== undefined) updates.commission_rate = commissionRate / 100;
  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data, error } = await db.from("affiliates").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ affiliate: data });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { error } = await db.from("affiliates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
