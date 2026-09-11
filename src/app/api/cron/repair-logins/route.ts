import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { repairCustomerLogin } from "@/lib/accountActions";
import { authorizeCron } from "@/lib/cronAuth";


// Trickles out the one-time backfill of logins for accounts that were stuck
// with a lead row but no real Supabase Auth user (see accountActions.ts —
// ensureCustomerLogin/repairCustomerLogin — for the root-cause writeup).
// Processes a small batch per run instead of all 256 at once, so the burst
// of "your account is ready" emails doesn't look like a spam blast to
// receiving mail servers.
const BATCH_SIZE = 20;

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req, "repair-logins");
  if (denied) return denied;

  const db = supabaseAdmin as any;
  const { data: batch } = await db
    .from("login_repair_queue")
    .select("id, email")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!batch?.length) {
    const { count } = await db.from("login_repair_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
    return NextResponse.json({ processed: 0, remaining: count || 0, done: true });
  }

  let repaired = 0;
  let failed = 0;
  for (const item of batch) {
    try {
      const result = await repairCustomerLogin(item.email);
      await db.from("login_repair_queue").update({
        status: result.repaired ? "repaired" : "failed",
        message: result.repaired ? null : result.message,
        processed_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (result.repaired) repaired++; else failed++;
    } catch (err: any) {
      await db.from("login_repair_queue").update({
        status: "failed", message: err?.message || "unknown error", processed_at: new Date().toISOString(),
      }).eq("id", item.id);
      failed++;
    }
  }

  const { count: remaining } = await db.from("login_repair_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  return NextResponse.json({ processed: batch.length, repaired, failed, remaining: remaining || 0 });
}
