import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { repairCustomerLogin } from "@/lib/accountActions";

// Repairs a customer_accounts row that has no matching Supabase Auth user —
// this happens whenever a row gets created without a linked Auth account
// (e.g. the admin "Add User" flow before it checked the Auth-creation
// result). Without a matching Auth user, login and password reset can never
// work for that email, no matter how many times the customer tries.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;

  const db = supabaseAdmin as any;
  const { data: account } = await db.from("customer_accounts").select("email").eq("id", id).single();
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const result = await repairCustomerLogin(account.email);
  if (!result.repaired) return NextResponse.json({ repaired: false, message: result.message });
  return NextResponse.json({ repaired: true, tempPassword: result.tempPassword });
}
