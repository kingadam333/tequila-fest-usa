import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMediaAccess } from "@/lib/mediaAuth";

export async function GET(req: NextRequest) {
  const payload = await verifyMediaAccess(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("media_partner_allocations")
    .select("id, event_id, ticket_type, quota, issued_count, events(city, state, date, slug, status)")
    .eq("media_partner_id", payload.mediaPartnerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ allocations: data || [] });
}
