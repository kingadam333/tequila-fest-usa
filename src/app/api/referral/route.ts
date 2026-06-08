import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { getEvent } from "@/lib/events";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getSessionUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/referral?event_slug=cincinnati — get or create referral code + stats
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventSlug = req.nextUrl.searchParams.get("event_slug");
  if (!eventSlug) return NextResponse.json({ error: "event_slug required" }, { status: 400 });

  const db = supabaseAdmin as any;

  const { data: account } = await db
    .from("customer_accounts")
    .select("id, email, first_name, loyalty_points")
    .eq("id", user.id)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Get or create referral code
  let { data: refCode } = await db
    .from("referral_codes")
    .select("*")
    .eq("customer_id", account.id)
    .eq("event_slug", eventSlug)
    .single();

  if (!refCode) {
    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await db.from("referral_codes").select("id").eq("code", code).single();
      if (!existing) break;
      code = generateCode();
    }
    const { data: created } = await db
      .from("referral_codes")
      .insert({ customer_id: account.id, customer_email: account.email, event_slug: eventSlug, code })
      .select()
      .single();
    refCode = created;
  }

  const { data: referrals } = await db
    .from("referrals")
    .select("*")
    .eq("referral_code", refCode.code);

  const converted = (referrals || []).filter((r: any) => r.status === "converted");
  const totalPoints = converted.reduce((s: number, r: any) => s + (r.points_awarded || 0), 0);
  const totalEntries = converted.reduce((s: number, r: any) => s + (r.raffle_entries || 0), 0);

  const event = getEvent(eventSlug);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";

  return NextResponse.json({
    code: refCode.code,
    referralUrl: `${appUrl}/events/${eventSlug}?ref=${refCode.code}`,
    stats: {
      totalReferrals: converted.length,
      pendingReferrals: (referrals || []).filter((r: any) => r.status === "pending").length,
      pointsEarned: totalPoints,
      raffleEntries: totalEntries,
    },
    event: event ? { city: event.city, date: event.date } : null,
    loyaltyPoints: account.loyalty_points || 0,
  });
}

// POST /api/referral — send email invites
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event_slug, invitee_emails, referral_code, referrer_name } = await req.json();
  if (!event_slug || !invitee_emails?.length || !referral_code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = getEvent(event_slug);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const referralUrl = `${appUrl}/events/${event_slug}?ref=${referral_code}`;

  const db = supabaseAdmin as any;

  const emails = (invitee_emails as string[]).slice(0, 10);
  for (const email of emails) {
    await db.from("referrals").insert({
      referral_code,
      referrer_customer_id: user.id,
      referred_email: email.toLowerCase(),
      status: "pending",
    });
  }

  const name = referrer_name || "A friend";
  const eventCity = event?.city || "USA";
  const eventDate = event?.date || "2026";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: emails,
    subject: `${name} invited you to Tequila Fest ${eventCity}! 🎉`,
    html: referralInviteHtml({ name, eventCity, eventDate, referralUrl }),
  });

  return NextResponse.json({ success: true, sent: emails.length });
}

function referralInviteHtml({ name, eventCity, eventDate, referralUrl }: {
  name: string; eventCity: string; eventDate: string; referralUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0500;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a0a00;border:1px solid #3a2000;border-radius:16px;overflow:hidden;max-width:600px;">
        <tr><td style="background:linear-gradient(135deg,#7B2FBE,#4a1a7a);padding:40px 40px 30px;text-align:center;">
          <p style="color:#F5A623;font-size:13px;letter-spacing:3px;margin:0 0 12px;text-transform:uppercase;">You&rsquo;re Invited</p>
          <h1 style="color:#fff;font-size:36px;margin:0;letter-spacing:2px;text-transform:uppercase;">Tequila Fest ${eventCity}</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:16px;margin:10px 0 0;">${eventDate}</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:rgba(255,255,255,0.9);font-size:18px;margin:0 0 16px;"><strong style="color:#F5A623;">${name}</strong> wants you to join them at Tequila Fest ${eventCity}!</p>
          <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 30px;">100+ premium tequilas, live music, gourmet food, and a night you won&rsquo;t forget. Grab your ticket before they sell out.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${referralUrl}" style="display:inline-block;background:#F5A623;color:#000;font-weight:bold;font-size:16px;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">&#127915; Get Your Tickets</a>
          </div>
          <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin:20px 0 0;">Or copy this link: <a href="${referralUrl}" style="color:#F5A623;">${referralUrl}</a></p>
        </td></tr>
        <tr><td style="background:#0d0500;padding:20px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">Tequila Fest USA &bull; <a href="https://www.tequilafestusa.com" style="color:#F5A623;">tequilafestusa.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
