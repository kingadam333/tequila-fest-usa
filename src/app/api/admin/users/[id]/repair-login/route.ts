import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT, generatePassword } from "@/lib/resend";

// Every table that FKs to customer_accounts.id, so a re-key doesn't orphan
// any of a customer's history. Kept in sync manually with the schema.
const CUSTOMER_ID_REFERENCES: { table: string; column: string }[] = [
  { table: "ticket_orders", column: "customer_id" },
  { table: "ticket_instances", column: "customer_id" },
  { table: "loyalty_transactions", column: "customer_id" },
  { table: "media_uploads", column: "customer_id" },
  { table: "social_share_claims", column: "customer_id" },
  { table: "referral_codes", column: "customer_id" },
  { table: "referrals", column: "referrer_customer_id" },
  { table: "redemptions", column: "customer_id" },
];

// Repairs a customer_accounts row that has no matching Supabase Auth user —
// this happens whenever a row gets created without a linked Auth account
// (e.g. the admin "Add User" flow before it checked the Auth-creation
// result). Without a matching Auth user, login and password reset can never
// work for that email, no matter how many times the customer tries.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id: oldId } = await params;

  const db = supabaseAdmin as any;
  const { data: account } = await db
    .from("customer_accounts")
    .select("id, email, first_name, last_name")
    .eq("id", oldId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Check whether an Auth user already exists for this email
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: "Failed to look up Auth users" }, { status: 500 });

  const existingAuthUser = users.find(u => u.email?.toLowerCase() === account.email.toLowerCase());
  if (existingAuthUser) {
    return NextResponse.json({ repaired: false, message: "This account already has a working login — nothing to repair." });
  }

  // No matching Auth user — create one and re-key customer_accounts (and
  // everything that references it) onto the new Auth user's id.
  const tempPassword = generatePassword();
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: account.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: account.first_name, last_name: account.last_name },
  });

  if (authErr || !authUser?.user) {
    return NextResponse.json({ error: authErr?.message || "Failed to create login" }, { status: 500 });
  }

  const newId = authUser.user.id;

  for (const ref of CUSTOMER_ID_REFERENCES) {
    const { error: repointErr } = await db.from(ref.table).update({ [ref.column]: newId }).eq(ref.column, oldId);
    if (repointErr) {
      // Roll back the Auth user we just created so we don't leave a dangling login
      await supabaseAdmin.auth.admin.deleteUser(newId).catch(() => {});
      return NextResponse.json({ error: `Failed to repoint ${ref.table}.${ref.column}: ${repointErr.message}` }, { status: 500 });
    }
  }

  const { error: caErr } = await db.from("customer_accounts").update({ id: newId }).eq("id", oldId);
  if (caErr) {
    await supabaseAdmin.auth.admin.deleteUser(newId).catch(() => {});
    return NextResponse.json({ error: `Failed to update customer_accounts.id: ${caErr.message}` }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  try {
    await resend.emails.send({
      from: FROM_SUPPORT,
      to: account.email,
      subject: "Your Tequila Fest USA account is ready",
      html: `<!DOCTYPE html><html><body style="background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0;padding:40px 20px">
<div style="max-width:560px;margin:0 auto">
  <p style="font-size:26px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0 0 24px">TEQUILA FEST USA</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="font-size:17px;font-weight:700;margin:0 0 8px">Hi ${account.first_name || "there"},</p>
    <p style="color:rgba(255,248,240,0.6);font-size:15px;line-height:1.6;margin:0 0 20px">
      We found and fixed an issue with your account login. Here's a fresh temporary password — please change it after logging in.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px 16px;width:100%">
      <tr><td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p><p style="margin:4px 0 0;color:#F5A623;font-family:monospace;font-size:18px;font-weight:900;letter-spacing:2px">${tempPassword}</p></td></tr>
    </table>
    <div style="text-align:center;margin-top:20px">
      <a href="${appUrl}/login" style="display:inline-block;background:#F5A623;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">LOG IN NOW</a>
    </div>
  </div>
</div></body></html>`,
    });
  } catch (err) {
    console.error("repair-login welcome email failed:", err);
  }

  return NextResponse.json({ repaired: true, newId, tempPassword });
}
