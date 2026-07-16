import { NextRequest, NextResponse } from "next/server";
import { verifyStaffToken } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Lets a staff member with the "admin" permission get into /admin using
// their own staff login instead of the single shared ADMIN_PASSWORD. Every
// existing admin API route checks x-admin-token against ADMIN_PASSWORD
// directly (verifyAdminToken in src/lib/adminAuth.ts) — rather than
// rewriting ~30 routes to support a second auth scheme, this endpoint
// verifies the staff member's identity + current permission (re-checked
// live against the DB, not just trusted from the JWT, in case it was
// revoked since they logged in) and hands back that same shared token.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing staff token" }, { status: 401 });

  const payload = await verifyStaffToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const db = supabaseAdmin as any;
  const { data: staff } = await db
    .from("staff_members")
    .select("permissions, status")
    .eq("id", payload.staffId)
    .single();

  if (!staff || staff.status !== "active") {
    return NextResponse.json({ error: "Account not active" }, { status: 401 });
  }
  if (!staff.permissions?.includes("admin")) {
    return NextResponse.json({ error: "You don't have admin access" }, { status: 403 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });

  return NextResponse.json({ adminToken: adminPassword });
}
