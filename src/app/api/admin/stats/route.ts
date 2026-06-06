import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });

    const ticketSessions = sessions.data.filter(
      s => s.metadata?.type === "ticket_purchase" && s.payment_status === "paid"
    );

    const totalRevenue = ticketSessions.reduce(
      (sum, s) => sum + (s.amount_total || 0) / 100, 0
    );

    const totalTickets = ticketSessions.reduce(
      (sum, s) => sum + parseInt(s.metadata?.quantity || "1"), 0
    );

    const today = new Date().toISOString().split("T")[0];
    const ordersToday = ticketSessions.filter(
      s => new Date(s.created * 1000).toISOString().split("T")[0] === today
    ).length;

    // Group by city
    const byCity: Record<string, { revenue: number; tickets: number }> = {};
    for (const s of ticketSessions) {
      const city = s.metadata?.eventCity || "Unknown";
      if (!byCity[city]) byCity[city] = { revenue: 0, tickets: 0 };
      byCity[city].revenue += (s.amount_total || 0) / 100;
      byCity[city].tickets += parseInt(s.metadata?.quantity || "1");
    }

    return NextResponse.json({
      totalRevenue,
      totalTickets,
      totalOrders: ticketSessions.length,
      ordersToday,
      byCity,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
