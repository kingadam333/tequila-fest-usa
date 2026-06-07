import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyCheckinAccess } from "@/lib/checkinAuth";

export async function POST(req: NextRequest) {
  if (!await verifyCheckinAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId, undo } = await req.json();
  if (!ticketId) return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });

  const db = supabaseAdmin as any;

  if (undo) {
    // Undo check-in
    const { error } = await db
      .from("ticket_instances")
      .update({ status: "valid", checked_in_at: null })
      .eq("id", ticketId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "valid" });
  }

  // Check current status first
  const { data: ticket } = await db
    .from("ticket_instances")
    .select("status, checked_in_at")
    .eq("id", ticketId)
    .single();

  if (ticket?.status === "checked_in") {
    return NextResponse.json({
      success: false,
      alreadyCheckedIn: true,
      checked_in_at: ticket.checked_in_at,
    });
  }

  const { error } = await db
    .from("ticket_instances")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: "checked_in" });
}
