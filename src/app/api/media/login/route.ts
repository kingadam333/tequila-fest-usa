import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { signMediaToken } from "@/lib/mediaAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: partner } = await db
    .from("media_partners")
    .select("id, company_name, contact_name, email, password_hash, status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!partner || !partner.password_hash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (partner.status !== "active") {
    return NextResponse.json({ error: "This account is not active. Contact Tequila Fest USA." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, partner.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signMediaToken({
    mediaPartnerId: partner.id,
    email: partner.email,
    companyName: partner.company_name,
  });

  return NextResponse.json({
    token,
    partner: { companyName: partner.company_name, contactName: partner.contact_name, email: partner.email },
  });
}
