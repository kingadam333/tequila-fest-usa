import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL } from "@/lib/resend";

const REWARDS = [
  { name: "Tequila Fest Tee", points: 250 },
  { name: "VIP Upgrade", points: 500 },
  { name: "Free Ticket", points: 1000 },
  { name: "Meet & Greet", points: 1500 },
];

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rewardName } = await req.json();
  const reward = REWARDS.find(r => r.name === rewardName);
  if (!reward) return NextResponse.json({ error: "Invalid reward" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: account } = await db
    .from("customer_accounts")
    .select("id, first_name, last_name, email, loyalty_points")
    .eq("id", user.id)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if ((account.loyalty_points || 0) < reward.points) {
    return NextResponse.json({ error: `Not enough points. You need ${reward.points} pts.` }, { status: 400 });
  }

  const customerName = [account.first_name, account.last_name].filter(Boolean).join(" ") || account.email;

  // Deduct points
  await db.from("customer_accounts")
    .update({ loyalty_points: account.loyalty_points - reward.points })
    .eq("id", user.id);

  // Log transaction
  await db.from("loyalty_transactions").insert({
    customer_id: user.id,
    action_code: "redemption",
    points: -reward.points,
    description: `Redeemed: ${reward.name}`,
    source_type: "redemption",
  });

  // Create redemption record
  const { data: redemption } = await db.from("redemptions").insert({
    customer_id: user.id,
    customer_email: account.email,
    customer_name: customerName,
    reward_name: reward.name,
    points_cost: reward.points,
    status: "pending",
  }).select().single();

  // Notify adam@tequilafestusa.com
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "adam@tequilafestusa.com",
      subject: `🎁 New Redemption: ${reward.name} — ${customerName}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:28px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
          <p style="color:rgba(255,248,240,0.4);font-size:12px;margin:4px 0 0">Rewards Redemption</p>
        </td></tr>
        <tr><td style="background:linear-gradient(135deg,#1a0e00,#2a1800);border:1px solid rgba(245,166,35,0.3);border-radius:16px;padding:28px">
          <p style="font-size:36px;margin:0 0 12px;text-align:center">🎁</p>
          <p style="font-family:Arial;font-size:20px;font-weight:900;color:#F5A623;margin:0 0 20px;text-align:center">NEW REDEMPTION REQUEST</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ["Customer", customerName],
              ["Email", account.email],
              ["Reward", reward.name],
              ["Points Used", `${reward.points} pts`],
              ["Points Remaining", `${account.loyalty_points - reward.points} pts`],
              ["Redemption ID", redemption?.id || "—"],
            ].map(([label, value]) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(255,248,240,0.4);font-size:13px;width:140px">${label}</td>
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#fff8f0;font-size:13px;font-weight:600">${value}</td>
            </tr>`).join("")}
          </table>
          <div style="margin-top:24px;text-align:center">
            <a href="${appUrl}/admin" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:14px;letter-spacing:1px;text-decoration:none;padding:12px 32px;border-radius:50px">
              VIEW IN ADMIN
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Failed to send redemption notification:", err);
  }

  return NextResponse.json({ success: true, pointsRemaining: account.loyalty_points - reward.points });
}
