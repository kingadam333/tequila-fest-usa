import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

// vendor_contacts catches vendor interest that never became a formal
// application — someone who just emailed vendors@ asking about a city.
// Kept separate from vendor_applications (which already tracks every real
// application by city) so campaign audiences can union both sources.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { email, name, city, notes } = await req.json();

  if (!email?.trim() || !city?.trim()) {
    return NextResponse.json({ error: "email and city are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: existing } = await db
    .from("vendor_contacts")
    .select("id, cities")
    .ilike("email", email.trim())
    .maybeSingle();

  if (existing) {
    const cities = Array.from(new Set([...(existing.cities || []), city.trim()]));
    const { data, error } = await db
      .from("vendor_contacts")
      .update({ cities, name: name?.trim() || undefined, notes: notes?.trim() || undefined, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contact: data });
  }

  const { data, error } = await db
    .from("vendor_contacts")
    .insert({ email: email.trim(), name: name?.trim() || null, cities: [city.trim()], notes: notes?.trim() || null, source: "inbox" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}
