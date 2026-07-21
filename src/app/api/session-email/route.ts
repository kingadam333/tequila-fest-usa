import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ email: null });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    const email = session.customer_email || session.customer_details?.email || null;
    const total = session.amount_total ? session.amount_total / 100 : 0;
    const quantity = session.line_items?.data?.[0]?.quantity ?? 1;
    const city = (session.metadata?.city as string) ?? "";
    const ticketType = (session.metadata?.ticketType as string) ?? "";
    const orderNumber = (session.metadata?.orderNumber as string) ?? sessionId;
    const phone = (session.metadata?.customerPhone as string) ?? "";
    return NextResponse.json({ email, total, quantity, city, ticketType, orderNumber, phone });
  } catch {
    return NextResponse.json({ email: null });
  }
}
