import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVendorApprovalEmail } from "../route";

// Bulk version of resend-payment-link — resends to every approved vendor
// who hasn't paid yet. Each vendor gets its own fresh Stripe session (fixed
// expiry + metadata), so this is also the fix for any vendor still holding
// a stale pre-fix link.
//
// Always excludes vendors whose applied cities are ALL past events (status
// "completed") — no point resending a payment link for a festival that
// already happened. Pass `city` to further narrow to one specific city.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  let city: string | undefined;
  try {
    const body = await req.json();
    city = body?.city || undefined;
  } catch {
    // no body — resend to all upcoming-city unpaid vendors
  }

  const db = supabaseAdmin as any;

  const { data: events } = await db.from("events").select("city, status");
  const upcomingCities = new Set(
    (events || []).filter((e: any) => e.status !== "completed").map((e: any) => e.city)
  );

  const { data: apps, error } = await db
    .from("vendor_applications")
    .select("*")
    .eq("status", "approved")
    .eq("paid", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const targeted = (apps || []).filter((app: any) => {
    const cities: string[] = app.cities || [];
    if (city) return cities.includes(city);
    return cities.some((c) => upcomingCities.has(c));
  });

  if (!targeted.length) return NextResponse.json({ ok: true, sent: 0, failed: [] });

  const failed: { id: string; business_name: string; error: string }[] = [];
  let sent = 0;

  for (const app of targeted) {
    try {
      await sendVendorApprovalEmail(db, app);
      sent++;
    } catch (err: any) {
      failed.push({ id: app.id, business_name: app.business_name, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
