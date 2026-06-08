import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin as any;

  // Aggregate by name to avoid duplicate entries for the same person across multiple accounts
  const { data, error } = await db.rpc("get_leaderboard");

  if (error) {
    // Fallback: simple query without aggregation
    const { data: fallback } = await db
      .from("customer_accounts")
      .select("first_name, last_name, loyalty_points")
      .gt("loyalty_points", 0)
      .order("loyalty_points", { ascending: false })
      .limit(20);

    const leaderboard = (fallback || []).map((row: any, i: number) => ({
      rank: i + 1,
      name: `${row.first_name || "Fan"} ${row.last_name ? row.last_name[0] + "." : ""}`.trim(),
      points: row.loyalty_points,
    }));
    return NextResponse.json({ leaderboard });
  }

  const leaderboard = (data || []).map((row: any, i: number) => ({
    rank: i + 1,
    name: row.display_name,
    points: row.total_points,
  }));

  return NextResponse.json({ leaderboard });
}
