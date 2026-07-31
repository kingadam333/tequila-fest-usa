import { NextRequest, NextResponse } from "next/server";
import { verifyAffiliateAccess } from "@/lib/affiliateAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Lets an affiliate point their own link/QR code at a specific city's event
// page (or back to the homepage) — only the destination, never their slug,
// so their already-shared link/QR code keeps working either way.
export async function PATCH(req: NextRequest) {
  const payload = await verifyAffiliateAccess(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { destinationUrl } = await req.json();
  if (!destinationUrl?.trim()) return NextResponse.json({ error: "destinationUrl is required" }, { status: 400 });

  let normalized = destinationUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  try { new URL(normalized); } catch { return NextResponse.json({ error: "Not a valid URL" }, { status: 400 }); }

  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("short_links")
    .update({ destination_url: normalized })
    .eq("affiliate_id", payload.affiliateId)
    .select("slug, destination_url")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link: data });
}
