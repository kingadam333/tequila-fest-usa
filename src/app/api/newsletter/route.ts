import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";

const BREVO_LIST_IDS: Record<string, number> = {
  Cincinnati: 29,
  Cleveland:  33,
  Columbus:   34,
  Phoenix:    57,
};

async function addToBrevo(firstName: string, email: string, phone: string | null, cities: string[]) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  // If no cities selected, add to all lists
  const targetCities = cities.length > 0 ? cities : Object.keys(BREVO_LIST_IDS);
  const listIds = targetCities
    .map(c => BREVO_LIST_IDS[c])
    .filter(Boolean);

  const body: Record<string, any> = {
    email,
    attributes: {
      FIRSTNAME: firstName,
      ...(phone ? { SMS: phone } : {}),
    },
    listIds,
    updateEnabled: true, // update existing contact if already in Brevo
  };

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Brevo error:", res.status, text);
  }
}

export async function POST(req: NextRequest) {
  const { firstName, email, phone, cities } = await req.json();

  if (!firstName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCities = Array.isArray(cities) ? cities : [];
  const db = supabaseAdmin as any;

  // Save to our DB
  const { error } = await db.from("newsletter_subscribers").upsert(
    {
      first_name: firstName.trim(),
      email: cleanEmail,
      phone: phone?.trim() || null,
      cities: cleanCities,
      source: "website",
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  // Push to Brevo (non-blocking)
  addToBrevo(firstName.trim(), cleanEmail, phone?.trim() || null, cleanCities)
    .catch(err => console.error("Brevo sync error:", err));

  // Send welcome email via Resend (non-blocking)
  const cityList = cleanCities.length > 0 ? cleanCities : ["Cincinnati", "Cleveland", "Columbus", "Phoenix"];
  const cityRows = [
    { city: "Cincinnati, OH", date: "Jun 13, 2026", id: 29 },
    { city: "Cleveland, OH",  date: "Jul 11, 2026", id: 33 },
    { city: "Columbus, OH",   date: "Aug 8, 2026",  id: 34 },
    { city: "Phoenix, AZ",    date: "Sep 12, 2026", id: 57 },
  ].filter(r => cityList.includes(r.city.split(",")[0]));

  resend.emails.send({
    from: FROM_SUPPORT,
    to: cleanEmail,
    subject: "You're on the list 🥃 — Tequila Fest USA",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">

    <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 32px">TEQUILA FEST USA</p>

    <div style="background:linear-gradient(135deg,rgba(245,166,35,0.15),rgba(245,166,35,0.05));border:1px solid rgba(245,166,35,0.25);border-radius:20px;padding:36px;margin-bottom:24px;text-align:center">
      <p style="font-size:48px;margin:0 0 12px">🥃</p>
      <h1 style="font-size:28px;font-weight:900;letter-spacing:3px;color:#F5A623;margin:0 0 8px">YOU'RE IN, ${firstName.trim().toUpperCase()}!</h1>
      <p style="color:rgba(255,248,240,0.65);font-size:15px;margin:0;line-height:1.6">
        Welcome to the inner circle. You'll be first to know about<br>
        ticket drops, exclusive presales, and festival updates.
      </p>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;letter-spacing:4px;color:#F5A623;margin:0 0 16px">
        ${cleanCities.length > 0 ? "YOUR CITIES" : "2026 TOUR CITIES"}
      </p>
      <table style="width:100%;border-collapse:collapse">
        ${cityRows.map((r, i) => `
        <tr>
          <td style="padding:8px 0;${i < cityRows.length - 1 ? "border-bottom:1px solid rgba(255,255,255,0.07)" : ""}">
            <span style="color:#fff8f0;font-weight:600">${r.city}</span>
            <span style="float:right;color:rgba(255,248,240,0.4);font-size:13px">${r.date}</span>
          </td>
        </tr>`).join("")}
      </table>
    </div>

    <div style="text-align:center;margin-bottom:32px">
      <a href="https://tequilafestusa.com/events"
         style="display:inline-block;background:#F5A623;color:#000;font-weight:900;font-size:14px;letter-spacing:2px;padding:14px 36px;border-radius:50px;text-decoration:none">
        GET YOUR TICKETS
      </a>
    </div>

    <p style="color:rgba(255,248,240,0.2);font-size:12px;text-align:center;margin:0;line-height:1.8">
      You signed up at tequilafestusa.com &nbsp;·&nbsp; No spam, ever &nbsp;·&nbsp;
      <a href="https://tequilafestusa.com/unsubscribe?email=${encodeURIComponent(cleanEmail)}" style="color:rgba(255,248,240,0.3)">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`,
  }).catch((err: any) => console.error("Welcome email error:", err));

  return NextResponse.json({ success: true });
}
