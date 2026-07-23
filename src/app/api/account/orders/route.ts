import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  // Get current user from session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { supabaseAdmin } = await import("@/lib/supabase");
  const db = supabaseAdmin as any;

  const { data: orders, error } = await db
    .from("ticket_orders")
    .select(`*, ticket_instances(id, qr_code, ticket_number, status, holder_name, ticket_type, checked_in_at)`)
    .eq("customer_email", user.email)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: orders || [] });
}
