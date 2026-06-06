import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ user: null });

  // Fetch profile from customer_accounts
  const { supabaseAdmin } = await import("@/lib/supabase");
  const db = supabaseAdmin as any;
  const { data: profile } = await db
    .from("customer_accounts")
    .select("first_name, last_name, phone, loyalty_points")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: profile?.first_name || user.user_metadata?.first_name || "",
      lastName: profile?.last_name || user.user_metadata?.last_name || "",
      phone: profile?.phone || "",
      loyaltyPoints: profile?.loyalty_points || 0,
    },
  });
}
