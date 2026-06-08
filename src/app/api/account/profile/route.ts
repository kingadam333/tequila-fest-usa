import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { firstName, lastName, phone } = await req.json();
  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { error } = await db
    .from("customer_accounts")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone?.trim() || null,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
