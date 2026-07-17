import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  const [{ count: pending }, { count: repaired }, { count: failed }] = await Promise.all([
    db.from("login_repair_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("login_repair_queue").select("id", { count: "exact", head: true }).eq("status", "repaired"),
    db.from("login_repair_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return NextResponse.json({ pending: pending || 0, repaired: repaired || 0, failed: failed || 0 });
}
