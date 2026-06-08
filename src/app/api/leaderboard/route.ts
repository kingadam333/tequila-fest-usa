import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin as any;

  const { data, error } = await db
    .from("customer_accounts")
    .select("first_name, last_name, loyalty_points")
    .gt("loyalty_points", 0)
    .order("loyalty_points", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leaderboard = (data || []).map((row: any, i: number) => ({
    rank: i + 1,
    name: `${row.first_name || "Fan"} ${row.last_name ? row.last_name[0] + "." : ""}`.trim(),
    points: row.loyalty_points,
  }));

  return NextResponse.json({ leaderboard });
}
