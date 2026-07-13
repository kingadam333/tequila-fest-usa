import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { media_partner_id, event_id, ticket_type, quota } = await req.json();
  if (!media_partner_id || !event_id || !ticket_type?.trim() || !quota) {
    return NextResponse.json({ error: "media_partner_id, event_id, ticket_type, and quota are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("media_partner_allocations")
    .upsert(
      { media_partner_id, event_id, ticket_type: ticket_type.trim(), quota: parseInt(quota) },
      { onConflict: "media_partner_id,event_id,ticket_type" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ allocation: data });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { error } = await db.from("media_partner_allocations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
