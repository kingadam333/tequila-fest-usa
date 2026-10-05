import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import {
  sponsorDb, eventsStillAvailable, markPackageSold, sendSponsorEmail, sendSponsorSms,
  approvedEmail, declinedEmail, paidInFullEmail, invoiceEmail, loadPaymentSettings, payUrl, money, eventsLabel, type SponsorReservation,
} from "@/lib/sponsorReservations";

type Body =
  | { action: "approve" }
  | { action: "decline" }
  | { action: "mark_paid"; method: "zelle" | "check" | "card" }
  | { action: "resend_payment_link" }
  | { action: "save_notes"; notes: string };

// Admin actions on one reservation. Every status change is a conditional
// update on the expected prior status, so a double click can't send twice.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const db = sponsorDb();
  const { data: current } = await db.from("sponsor_reservations").select("*").eq("id", id).maybeSingle();
  const r0 = current as SponsorReservation | null;
  if (!r0) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  const now = new Date().toISOString();

  const transition = async (from: string[], updates: Record<string, unknown>) => {
    const { data } = await db.from("sponsor_reservations")
      .update({ ...updates, updated_at: now }).eq("id", id).in("status", from).select().maybeSingle();
    return data as SponsorReservation | null;
  };

  switch (body.action) {
    case "approve": {
      if (r0.status !== "pending") return NextResponse.json({ error: `Can't approve a reservation that is ${r0.status}.` }, { status: 409 });
      if (!(await eventsStillAvailable(r0))) {
        return NextResponse.json({ error: "This package is already sold (or hidden) for one of these events. Mark it available in Packages first, or decline." }, { status: 409 });
      }
      const r = await transition(["pending"], { status: "approved", approved_at: now });
      if (!r) return NextResponse.json({ error: "Reservation changed; refresh and try again." }, { status: 409 });
      await sendSponsorEmail(r.contact_email, "You're approved — complete your Tequila Fest USA sponsorship", approvedEmail(r));
      await sendSponsorSms(r, `Tequila Fest USA: ${r.company_name} is approved as a ${r.package_name} sponsor (${eventsLabel(r.events)}). Complete payment to lock in your spot: ${payUrl(r)}`);
      return NextResponse.json({ reservation: r });
    }
    case "decline": {
      const r = await transition(["pending", "approved"], { status: "declined", declined_at: now });
      if (!r) return NextResponse.json({ error: `Can't decline a reservation that is ${r0.status}.` }, { status: 409 });
      await sendSponsorEmail(r.contact_email, "About your Tequila Fest USA sponsorship request", declinedEmail(r));
      return NextResponse.json({ reservation: r });
    }
    case "mark_paid": {
      // Zelle or check received (or a card payment taken outside the site) — settles whatever is owed.
      const method = ["zelle", "check", "card"].includes(body.method) ? body.method : "zelle";
      const fromApproved = r0.status === "approved";
      if (fromApproved && !(await eventsStillAvailable(r0))) {
        return NextResponse.json({ error: "This package is already sold to someone else for one of these events." }, { status: 409 });
      }
      const r = await transition(["approved", "deposit_paid"], {
        status: "paid", amount_paid: r0.total, paid_at: now,
        ...(fromApproved ? { payment_method: method } : {}),
        admin_notes: `${r0.admin_notes ? r0.admin_notes + "\n" : ""}[${now.slice(0, 10)}] Marked paid by admin (${method}), ${money(r0.total - r0.amount_paid)} received.`,
      });
      if (!r) return NextResponse.json({ error: `Can't mark a reservation paid while it is ${r0.status}.` }, { status: 409 });
      if (fromApproved) await markPackageSold(r);
      await sendSponsorEmail(r.contact_email, "Payment received — your Tequila Fest USA sponsorship is confirmed", paidInFullEmail(r));
      return NextResponse.json({ reservation: r });
    }
    case "resend_payment_link": {
      if (r0.status !== "approved" && r0.status !== "deposit_paid") {
        return NextResponse.json({ error: "Only approved or invoiced reservations have a payment link." }, { status: 409 });
      }
      if (r0.status === "deposit_paid") {
        await sendSponsorEmail(r0.contact_email, `Invoice ${r0.invoice_number} — Tequila Fest USA sponsorship`, invoiceEmail(r0, await loadPaymentSettings()));
      } else {
        await sendSponsorEmail(r0.contact_email, "Your Tequila Fest USA sponsorship payment link", approvedEmail(r0));
      }
      return NextResponse.json({ reservation: r0 });
    }
    case "save_notes": {
      const { data, error } = await db.from("sponsor_reservations")
        .update({ admin_notes: String(body.notes ?? "").slice(0, 5000), updated_at: now }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ reservation: data });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
