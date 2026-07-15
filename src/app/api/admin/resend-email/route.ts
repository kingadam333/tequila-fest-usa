import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resendTicketEmail } from "@/lib/accountActions";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { order_number } = await req.json();
  if (!order_number) return NextResponse.json({ error: "order_number required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: order } = await db.from("ticket_orders").select("customer_email").eq("order_number", order_number).single();

  const result = await resendTicketEmail(order_number);
  if (!result.sent) {
    return NextResponse.json({ error: result.reason === "order_not_found" ? "Order not found" : "Failed to send email" }, { status: result.reason === "order_not_found" ? 404 : 500 });
  }

  return NextResponse.json({ success: true, email: order?.customer_email });
}
