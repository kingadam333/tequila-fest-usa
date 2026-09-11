import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { cronSecretConfigured } from "@/lib/cronAuth";

// Diagnostic for the scheduled jobs — booleans and counts only, never a secret
// value. Same shape as the marketing-env diagnostic next door.
//
// Exists because CRON_SECRET being unset is invisible from outside: the Vercel
// dashboard shows the schedule running normally while every invocation 401s.
// After setting CRON_SECRET and redeploying, hit this endpoint to confirm the
// deployment actually picked it up, rather than waiting two hours to find out
// from the next scheduled run.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const cronSecretSet = cronSecretConfigured();

  // The login-repair backlog is the clearest evidence of whether the schedule
  // is doing real work: it only drains when a run is actually authorized.
  const db = supabaseAdmin as any;
  const { count: pending } = await db
    .from("login_repair_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: total } = await db
    .from("login_repair_queue")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    cron_secret_set: cronSecretSet,
    admin_password_set: !!process.env.ADMIN_PASSWORD?.trim(),
    // When false, every scheduled run is rejected — see src/lib/cronAuth.ts.
    scheduled_jobs_can_authenticate: cronSecretSet,
    login_repair_queue: {
      pending: pending ?? null,
      total: total ?? null,
      note: "Drains 20 per run, every 2 hours, once runs are authorized.",
    },
  });
}
