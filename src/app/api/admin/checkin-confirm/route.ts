import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { ticketId, undo } = await req.json();
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });

  const db = supabaseAdmin as any;

  if (undo) {
    const { error } = await db
      .from("ticket_instances")
      .update({ status: "valid", checked_in_at: null })
      .eq("id", ticketId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "valid" });
  }

  // Guard against double check-in
  const { data: ticket } = await db
    .from("ticket_instances")
    .select("status, checked_in_at, holder_name")
    .eq("id", ticketId)
    .single();

  if (ticket?.status === "checked_in") {
    return NextResponse.json({ success: false, alreadyCheckedIn: true, checked_in_at: ticket.checked_in_at });
  }

  const { error } = await db
    .from("ticket_instances")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: "checked_in" });
}
