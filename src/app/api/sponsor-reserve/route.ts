import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { honeypotTripped, SPAM_REJECTION } from "@/lib/spamGuard";
import { SPONSOR_EVENT_OPTIONS, sponsorTotal } from "@/lib/sponsorPackages";
import { sponsorDb, sendSponsorEmail, receivedEmail, type SponsorReservation } from "@/lib/sponsorReservations";

const EVENT_IDS: string[] = SPONSOR_EVENT_OPTIONS.map((e) => e.id);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: "Reserve This" on /sponsors. Creates a pending reservation for admin
// review. The price is taken from sponsor_packages here, never from the client.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (honeypotTripped(body)) return NextResponse.json(SPAM_REJECTION, { status: 400 });

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  if (!(await verifyTurnstile(String(body.captchaToken || ""), ip))) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const str = (k: string, max = 200) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const companyName = str("companyName");
  const contactName = str("contactName");
  const contactEmail = str("contactEmail").toLowerCase();
  const contactPhone = str("contactPhone", 40);
  let website = str("website", 300);
  const packageId = str("packageId", 64);
  const events = Array.isArray(body.events)
    ? [...new Set((body.events as unknown[]).filter((e): e is string => typeof e === "string" && EVENT_IDS.includes(e)))]
    : [];

  if (!companyName || !contactName || !contactEmail || !contactPhone) {
    return NextResponse.json({ error: "Company name, contact name, email and phone are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(contactEmail)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (contactPhone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  if (!events.length) return NextResponse.json({ error: "Please choose at least one event." }, { status: 400 });
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  const db = sponsorDb();
  const { data: pkg } = await db
    .from("sponsor_packages")
    .select("id, name, price_per_event, sold_events, is_active")
    .eq("id", packageId)
    .maybeSingle();
  if (!pkg || !pkg.is_active) return NextResponse.json({ error: "That sponsorship package is no longer available." }, { status: 400 });

  const soldChosen = events.filter((e) => (pkg.sold_events || []).includes(e));
  if (soldChosen.length) {
    return NextResponse.json({ error: "One of the events you picked was just sold for this package. Please refresh and choose again." }, { status: 409 });
  }

  const { data: reservation, error } = await db
    .from("sponsor_reservations")
    .insert({
      package_id: pkg.id,
      package_name: pkg.name,
      events,
      price_per_event: pkg.price_per_event,
      total: sponsorTotal(pkg.price_per_event, events),
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website: website || null,
      sms_consent: body.smsConsent === true,
    })
    .select()
    .single();

  if (error || !reservation) {
    console.error("[sponsor-reserve] insert failed:", error?.message);
    return NextResponse.json({ error: "Something went wrong saving your request. Please try again." }, { status: 500 });
  }

  await sendSponsorEmail(contactEmail, "We received your sponsorship request — Tequila Fest USA", receivedEmail(reservation as SponsorReservation));
  return NextResponse.json({ ok: true });
}
