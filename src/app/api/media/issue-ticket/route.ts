import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMediaAccess } from "@/lib/mediaAuth";
import { resend, FROM_EMAIL, generatePassword, qrTicketHtml } from "@/lib/resend";
import crypto from "crypto";

// Media partners (radio, news, etc.) issue free contest-winner tickets
// against a pre-set quota. Reuses the same order/QR-ticket/account/email
// pipeline as a real Stripe purchase, just at $0 and tagged
// source: "media_comp" so it never counts toward real revenue.
export async function POST(req: NextRequest) {
  const payload = await verifyMediaAccess(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allocationId, winnerName, winnerEmail, quantity } = await req.json();
  if (!allocationId || !winnerName?.trim() || !winnerEmail?.trim()) {
    return NextResponse.json({ error: "allocationId, winnerName, and winnerEmail are required" }, { status: 400 });
  }
  const qty = Math.max(parseInt(quantity) || 1, 1);

  const db = supabaseAdmin as any;

  const { data: allocation } = await db
    .from("media_partner_allocations")
    .select("*, events(id, slug, city, date, time, venue, venue_detail, status)")
    .eq("id", allocationId)
    .eq("media_partner_id", payload.mediaPartnerId)
    .single();

  if (!allocation) return NextResponse.json({ error: "Allocation not found" }, { status: 404 });

  const remaining = allocation.quota - allocation.issued_count;
  if (qty > remaining) {
    return NextResponse.json({ error: `Only ${remaining} ticket(s) remaining on this allocation` }, { status: 400 });
  }
  if (allocation.events?.status === "completed" || allocation.events?.status === "cancelled") {
    return NextResponse.json({ error: "This event is no longer accepting ticket issuance" }, { status: 400 });
  }

  const event = allocation.events;
  const customerEmail = winnerEmail.trim().toLowerCase();
  const customerName = winnerName.trim();
  const firstName = customerName.split(" ")[0] || "there";
  const orderNumber = `TFC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // 1. Create the comp order
  const { data: order, error: orderError } = await db
    .from("ticket_orders")
    .insert({
      order_number: orderNumber,
      customer_email: customerEmail,
      customer_name: customerName,
      event_slug: event.slug,
      event_city: event.city,
      ticket_type: allocation.ticket_type,
      quantity: qty,
      unit_price: 0,
      subtotal: 0,
      discount_amount: 0,
      total: 0,
      status: "paid",
      source: "media_comp",
      media_partner_id: payload.mediaPartnerId,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("Media comp order insert error:", orderError);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // 2. Create QR-coded ticket instances
  const tickets = Array.from({ length: qty }, (_, i) => ({
    order_id: order.id,
    ticket_number: i + 1,
    event_slug: event.slug,
    event_city: event.city,
    event_id: event.id,
    ticket_type: allocation.ticket_type,
    holder_name: i === 0 ? customerName : "Guest",
    qr_code: `TKT-${order.id.slice(-8).toUpperCase()}-${String(i + 1).padStart(3, "0")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    status: "valid" as const,
  }));
  const { error: ticketError } = await db.from("ticket_instances").insert(tickets);
  if (ticketError) console.error("Media comp ticket_instances error:", ticketError);

  // 3. Auto-create an account for the winner, same as a real purchase
  let newAccountPassword: string | null = null;
  try {
    const { data: existingAccount } = await db
      .from("customer_accounts")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (!existingAccount) {
      const { createClient } = await import("@supabase/supabase-js");
      const adminAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const password = generatePassword();
      const nameParts = customerName.split(" ");
      const { data: authUser, error: authErr } = await adminAuth.auth.admin.createUser({
        email: customerEmail,
        password,
        email_confirm: true,
        user_metadata: { first_name: nameParts[0] || firstName, last_name: nameParts.slice(1).join(" ") || "" },
      });
      if (!authErr && authUser?.user) {
        await db.from("customer_accounts").upsert({
          id: authUser.user.id,
          email: customerEmail,
          first_name: nameParts[0] || firstName,
          last_name: nameParts.slice(1).join(" ") || null,
        }, { onConflict: "email" });
        newAccountPassword = password;
      } else if (authErr) {
        console.error("Media comp auth createUser error:", authErr);
      }
    }
  } catch (err) {
    console.error("Media comp account creation error:", err);
  }

  // 4. Email the winner their QR ticket(s)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
    const ticketInstances = tickets.map((t, i) => ({
      qrCode: t.qr_code,
      ticketNumber: i + 1,
      totalInOrder: qty,
      holderName: t.holder_name,
      ticketType: allocation.ticket_type,
    }));
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `🎉 You Won Tickets to Tequila Fest ${event.city}! — ${orderNumber}`,
      html: qrTicketHtml({
        firstName,
        eventCity: event.city,
        eventDate: event.date || "2026",
        eventTime: event.time || "3:00 PM – 9:00 PM",
        eventVenue: event.venue ? `${event.venue}, ${event.venue_detail || ""}` : "",
        orderNumber,
        tickets: ticketInstances,
        appUrl,
        newPassword: newAccountPassword || undefined,
      }),
    });
  } catch (err) {
    console.error("Media comp email error:", err);
  }

  // 5. Bump the allocation's issued count
  await db.from("media_partner_allocations").update({ issued_count: allocation.issued_count + qty }).eq("id", allocationId);

  return NextResponse.json({ ok: true, orderNumber });
}
