import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Custom short links for QR codes / marketing — /go/<slug> redirects to
// whatever destination the admin set, and bumps a click counter along the
// way (best-effort, not transactionally safe, but fine for a marketing
// click count — not a billing-critical number).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;

  const { data } = await db.from("short_links").select("id, destination_url, clicks").eq("slug", slug).maybeSingle();
  if (!data) return NextResponse.redirect(new URL("/", req.url));

  db.from("short_links").update({ clicks: (data.clicks || 0) + 1 }).eq("id", data.id).then(() => {});

  return NextResponse.redirect(data.destination_url);
}
