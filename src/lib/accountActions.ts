import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, FROM_SUPPORT, passwordResetHtml, qrTicketHtml, generatePassword } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";
import crypto from "crypto";

// Shared by the public /api/auth/forgot-password route AND the AI inbox
// (so a confident AI reply can actually trigger a real reset email, not
// just tell the customer to go click a link themselves).
export async function sendPasswordResetEmail(email: string): Promise<{ sent: boolean; reason?: string }> {
  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();

  const { data: account } = await db.from("customer_accounts").select("id").eq("email", cleanEmail).single();
  if (!account) return { sent: false, reason: "no_account" };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.from("password_reset_tokens").delete().eq("email", cleanEmail);
  await db.from("password_reset_tokens").insert({ token, email: cleanEmail, expires_at: expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: cleanEmail,
      subject: "Reset your Tequila Fest USA password",
      html: passwordResetHtml({ resetUrl }),
    });
    return { sent: true };
  } catch (err) {
    console.error("sendPasswordResetEmail error:", err);
    return { sent: false, reason: "send_failed" };
  }
}

// Shared by admin's manual "resend ticket email" button AND the AI inbox.
export async function resendTicketEmail(orderNumber: string): Promise<{ sent: boolean; reason?: string }> {
  const db = supabaseAdmin as any;

  const { data: order } = await db.from("ticket_orders").select("*").eq("order_number", orderNumber).single();
  if (!order) return { sent: false, reason: "order_not_found" };

  const { data: instances } = await db
    .from("ticket_instances")
    .select("*")
    .eq("order_id", order.id)
    .order("ticket_number", { ascending: true });

  const event = getEvent(order.event_slug);
  const firstName = (order.customer_name || "Guest").split(" ")[0];
  const ticketLabel = TICKET_LABELS[order.ticket_type as keyof typeof TICKET_LABELS] || order.ticket_type || "All Inclusive";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";

  const ticketInstances = (instances || []).map((t: any, i: number) => ({
    qrCode: t.qr_code,
    ticketNumber: t.ticket_number || i + 1,
    totalInOrder: order.quantity,
    holderName: t.holder_name || order.customer_name,
    ticketType: ticketLabel,
  }));

  if (ticketInstances.length === 0) {
    for (let i = 0; i < order.quantity; i++) {
      ticketInstances.push({
        qrCode: `TKT-${order.id.slice(-8).toUpperCase()}-${String(i + 1).padStart(3, "0")}-RESENT`,
        ticketNumber: i + 1,
        totalInOrder: order.quantity,
        holderName: order.customer_name,
        ticketType: ticketLabel,
      });
    }
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject: `🎟️ Your Tequila Fest ${order.event_city} Tickets — ${order.order_number}`,
      html: qrTicketHtml({
        firstName,
        eventCity: order.event_city,
        eventDate: event?.date || "2026",
        eventTime: event?.time || "3:00 PM – 9:00 PM",
        eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
        orderNumber: order.order_number,
        tickets: ticketInstances,
        appUrl,
        total: Number(order.total),
        ticketType: ticketLabel,
        quantity: order.quantity,
      }),
    });
    return { sent: true };
  } catch (err) {
    console.error("resendTicketEmail error:", err);
    return { sent: false, reason: "send_failed" };
  }
}

// Looks up whether an email has a registered account — used to give the AI
// accurate context (sign-up vs. forgot-password wording) instead of guessing.
export async function lookupAccount(email: string): Promise<{ hasAccount: boolean; loyaltyPoints?: number }> {
  const db = supabaseAdmin as any;
  const { data } = await db
    .from("customer_accounts")
    .select("id, loyalty_points")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data ? { hasAccount: true, loyaltyPoints: data.loyalty_points } : { hasAccount: false };
}

// Free-text search across customer_accounts and ticket_orders by email,
// name, or order number — the core lookup used by the admin AI Assistant so
// it can find "the right person" from a vague description before acting.
export async function searchCustomers(query: string) {
  const db = supabaseAdmin as any;
  const q = query.trim();

  const { data: accounts } = await db
    .from("customer_accounts")
    .select("id, email, first_name, last_name, phone, loyalty_points, created_at")
    .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(10);

  const { data: orders } = await db
    .from("ticket_orders")
    .select("order_number, customer_email, customer_name, event_city, ticket_type, quantity, total, status, created_at")
    .or(`customer_email.ilike.%${q}%,customer_name.ilike.%${q}%,order_number.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  return { accounts: accounts || [], orders: orders || [] };
}

// Full detail for one order — used by the AI Assistant before taking any
// action on it (e.g. reassigning the email), so it works off real ticket
// data instead of guessing from the search snippet.
export async function getOrderDetails(orderNumber: string) {
  const db = supabaseAdmin as any;
  const { data: order } = await db.from("ticket_orders").select("*").eq("order_number", orderNumber).single();
  if (!order) return { found: false };

  const { data: tickets } = await db
    .from("ticket_instances")
    .select("ticket_number, holder_name, status, checked_in_at")
    .eq("order_id", order.id)
    .order("ticket_number", { ascending: true });

  return { found: true, order, tickets: tickets || [] };
}

// Reassigns an order (and its ticket instances) to the correct email —
// for when a customer typed the wrong address at checkout. Re-links
// customer_id to whatever account (if any) owns the new email, since the
// old customer_id almost certainly belongs to the wrong person.
export async function reassignOrderEmail(orderNumber: string, newEmail: string, newName?: string) {
  const db = supabaseAdmin as any;
  const cleanEmail = newEmail.trim().toLowerCase();

  const { data: order } = await db.from("ticket_orders").select("id").eq("order_number", orderNumber).single();
  if (!order) return { success: false, reason: "order_not_found" };

  const { data: account } = await db.from("customer_accounts").select("id").eq("email", cleanEmail).maybeSingle();
  const newCustomerId = account?.id || null;

  const orderUpdates: Record<string, unknown> = { customer_email: cleanEmail, customer_id: newCustomerId };
  if (newName) orderUpdates.customer_name = newName;

  const { error: orderErr } = await db.from("ticket_orders").update(orderUpdates).eq("id", order.id);
  if (orderErr) return { success: false, reason: orderErr.message };

  await db.from("ticket_instances").update({ customer_id: newCustomerId }).eq("order_id", order.id);

  return { success: true, linkedToExistingAccount: !!newCustomerId };
}

// Shared by the ticket-purchase and vendor-payment Stripe webhooks. Ensures
// the given email has a working Supabase Auth login, creating one if
// needed, and returns the new temp password (to show the customer) or null
// if a login already existed.
//
// This exists because /api/pre-checkout upserts a bare customer_accounts
// "lead" row (no Auth user) the moment someone starts checkout, BEFORE
// payment completes. The webhooks used to only check "does a
// customer_accounts row exist?" before deciding whether to create the Auth
// login — but by the time the webhook runs, that lead row already exists,
// so the check always short-circuited and no first-time buyer ever got a
// real login. The check now looks for an actual Auth user, and links up to
// the pre-existing lead row's id (rather than leaving the two orphaned from
// each other) using the same id-preserving createUser trick as
// repairCustomerLogin below.
export async function ensureCustomerLogin(
  email: string, firstName: string, lastName: string, phone: string
): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  const db = supabaseAdmin as any;

  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("ensureCustomerLogin: failed to list Auth users:", listErr);
    return null;
  }
  if (users.find(u => u.email?.toLowerCase() === cleanEmail)) {
    return null; // already has a working login
  }

  const { data: existingAccount } = await db.from("customer_accounts").select("id").eq("email", cleanEmail).maybeSingle();

  const password = generatePassword();
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    ...(existingAccount ? { id: existingAccount.id } : {}),
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName || "", phone: phone || "" },
  } as any);

  if (authErr || !authUser?.user) {
    console.error("ensureCustomerLogin: createUser failed:", authErr);
    return null;
  }
  if (existingAccount && authUser.user.id !== existingAccount.id) {
    // Auth API didn't honor the requested id — leave the lead row as-is
    // rather than silently creating a second, disconnected account.
    console.error(`ensureCustomerLogin: id mismatch for ${cleanEmail} — Auth API returned ${authUser.user.id}, expected ${existingAccount.id}`);
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
    return null;
  }

  await db.from("customer_accounts").upsert({
    id: authUser.user.id,
    email: cleanEmail,
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
  }, { onConflict: "id" });

  return password;
}

// Repairs a customer_accounts row that has no matching Supabase Auth user —
// shared by the admin "Repair Login" button and the AI Assistant. See
// api/admin/users/[id]/repair-login/route.ts for the full story on why the
// Auth user must be created with the SAME id customer_accounts already uses
// rather than re-keying across non-deferrable foreign keys.
export async function repairCustomerLogin(email: string): Promise<
  { repaired: true; tempPassword: string } | { repaired: false; message: string }
> {
  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();

  const { data: account } = await db
    .from("customer_accounts")
    .select("id, email, first_name, last_name")
    .eq("email", cleanEmail)
    .maybeSingle();
  if (!account) return { repaired: false, message: "No account found for that email." };

  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return { repaired: false, message: "Failed to look up Auth users." };

  if (users.find(u => u.email?.toLowerCase() === cleanEmail)) {
    return { repaired: false, message: "This account already has a working login — nothing to repair." };
  }

  const tempPassword = generatePassword();
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    id: account.id,
    email: account.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: account.first_name, last_name: account.last_name },
  } as any);

  if (authErr || !authUser?.user) {
    return { repaired: false, message: authErr?.message || "Failed to create login." };
  }
  if (authUser.user.id !== account.id) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
    return { repaired: false, message: "Auth API did not honor the requested id — needs manual repair." };
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
    console.error("repairCustomerLogin welcome email failed:", err);
  }

  return { repaired: true, tempPassword };
}
