import { NextRequest, NextResponse } from "next/server";
import { verifyStaffToken } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Lets an already-logged-in staff member's browser refresh its view of their
// own permissions from the DB, without requiring a fresh login. Needed
// because permissions are only ever handed to the client at login time
// (baked into localStorage) — if an admin edits a staff member's permissions
// while they're already logged in, their browser has no way to find out
// otherwise.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing staff token" }, { status: 401 });

  const payload = await verifyStaffToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const db = supabaseAdmin as any;
  const { data: staff } = await db
    .from("staff_members")
    .select("name, email, permissions, status")
    .eq("id", payload.staffId)
    .single();

  if (!staff || staff.status !== "active") {
    return NextResponse.json({ error: "Account not active" }, { status: 401 });
  }

  return NextResponse.json({ staff: { name: staff.name, email: staff.email, permissions: staff.permissions || [] } });
}
