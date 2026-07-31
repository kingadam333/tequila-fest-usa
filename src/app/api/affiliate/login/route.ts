import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { signAffiliateToken } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: affiliate } = await db
    .from("affiliates")
    .select("id, first_name, last_name, email, password_hash, status")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!affiliate || !affiliate.password_hash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (affiliate.status !== "active") {
    return NextResponse.json({ error: "This account is not active. Contact Tequila Fest USA." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, affiliate.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const name = `${affiliate.first_name}${affiliate.last_name ? ` ${affiliate.last_name}` : ""}`;
  const token = await signAffiliateToken({ affiliateId: affiliate.id, email: affiliate.email, name });

  return NextResponse.json({ token, affiliate: { name, email: affiliate.email } });
}
