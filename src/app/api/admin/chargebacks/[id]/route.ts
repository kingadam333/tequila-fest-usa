import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { buildEvidenceText } from "@/lib/chargebacks";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: chargeback } = await db.from("chargebacks").select("*").eq("id", id).single();
  if (!chargeback) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: order } = chargeback.order_id
    ? await db.from("ticket_orders").select("*").eq("id", chargeback.order_id).maybeSingle()
    : { data: null };

  const evidenceText = buildEvidenceText(chargeback, order);
  return NextResponse.json({ chargeback, order, evidenceText });
}
