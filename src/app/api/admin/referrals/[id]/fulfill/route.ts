import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeTicketType } from "@/lib/normalizeTicketType";

// Manually resolve a referral_rewards row stuck at capacity_blocked or
// no_ticket — e.g. VIP has since opened back up, or the admin wants to
// override capacity for a specific customer. Admin picks the exact
// ticket_instance_id to upgrade rather than this route re-guessing.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const { ticketInstanceId } = await req.json();
  if (!ticketInstanceId) return NextResponse.json({ error: "ticketInstanceId is required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: reward } = await db.from("referral_rewards").select("*").eq("id", id).maybeSingle();
  if (!reward) return NextResponse.json({ error: "Reward not found" }, { status: 404 });

  const { data: instance } = await db.from("ticket_instances").select("id, ticket_orders!inner(customer_id)").eq("id", ticketInstanceId).maybeSingle();
  if (!instance || instance.ticket_orders?.customer_id !== reward.customer_id) {
    return NextResponse.json({ error: "That ticket doesn't belong to this customer" }, { status: 400 });
  }

  const { data: event } = await db.from("events").select("ticket_types(name)").eq("slug", reward.event_slug).maybeSingle();
  const vipTypeName = (event?.ticket_types || []).find((t: any) => normalizeTicketType(t.name) === "VIP Experience")?.name || "VIP Experience";

  const { error: upgradeError } = await db.from("ticket_instances").update({ ticket_type: vipTypeName }).eq("id", ticketInstanceId);
  if (upgradeError) return NextResponse.json({ error: upgradeError.message }, { status: 500 });

  const { data, error } = await db
    .from("referral_rewards")
    .update({ status: "fulfilled", ticket_instance_id: ticketInstanceId, fulfilled_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reward: data });
}

// List the customer's own tickets for that event, so the admin UI can offer
// a picker instead of guessing which one to upgrade.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: reward } = await db.from("referral_rewards").select("customer_id, event_slug").eq("id", id).maybeSingle();
  if (!reward) return NextResponse.json({ error: "Reward not found" }, { status: 404 });

  const { data: event } = await db.from("events").select("id").eq("slug", reward.event_slug).maybeSingle();
  if (!event) return NextResponse.json({ tickets: [] });

  const { data: instances } = await db
    .from("ticket_instances")
    .select("id, ticket_type, holder_name, ticket_orders!inner(customer_id, status)")
    .eq("event_id", event.id)
    .eq("ticket_orders.customer_id", reward.customer_id)
    .eq("ticket_orders.status", "paid");

  return NextResponse.json({ tickets: instances || [] });
}
