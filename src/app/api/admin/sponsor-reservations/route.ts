import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { sponsorDb } from "@/lib/sponsorReservations";

// Admin: every sponsorship reservation, newest first.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { data, error } = await sponsorDb()
    .from("sponsor_reservations")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 999);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reservations: data || [] });
}
