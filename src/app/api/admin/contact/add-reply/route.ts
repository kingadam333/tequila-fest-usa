import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

// Backfill a historical reply (one that was sent but never landed in
// contact_replies — e.g., because the old single-column admin_reply got
// overwritten, or because a broken handler silently dropped it).
// This DOES NOT send any email — it only logs the reply on the thread.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { submissionId, sent_by, body, from_email, from_name, created_at } = await req.json();

  if (!submissionId || !body?.trim()) {
    return NextResponse.json({ error: "submissionId and body required" }, { status: 400 });
  }
  const validSenders = ["admin", "ai", "customer"] as const;
  const sender = validSenders.includes(sent_by) ? sent_by : "admin";
  const direction = sender === "customer" ? "inbound" : "outbound";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  // Verify the submission exists and grab its inbox for default from_email
  const { data: sub } = await db
    .from("contact_submissions")
    .select("id, inbox, status, email, name")
    .eq("id", submissionId)
    .single();
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const inboxDefaults: Record<string, string> = {
    Brands:     "brands@mail.tequilafestusa.com",
    Vendors:    "vendors@mail.tequilafestusa.com",
    Sponsors:   "sponsors@mail.tequilafestusa.com",
    Affiliates: "affiliates@mail.tequilafestusa.com",
    Support:    "help@mail.tequilafestusa.com",
  };
  const defaultFromEmail = sender === "customer"
    ? sub.email
    : (inboxDefaults[sub.inbox || "Support"] || "help@mail.tequilafestusa.com");
  const defaultFromName = sender === "customer" ? (sub.name || "Customer")
    : sender === "ai" ? "AI Assistant"
    : "Admin";

  const insertPayload: Record<string, unknown> = {
    submission_id: submissionId,
    direction,
    sent_by: sender,
    from_email: from_email || defaultFromEmail,
    from_name: from_name || defaultFromName,
    body,
  };
  if (created_at) insertPayload.created_at = created_at;

  const { data: inserted, error } = await db
    .from("contact_replies")
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bump status to "replied" if it's still "new" or "needs-review" and the
  // backfilled reply is outbound. (Don't touch auto-replied / replied rows.)
  if (direction === "outbound" && (sub.status === "new" || sub.status === "needs-review")) {
    const updates: Record<string, unknown> = { status: sender === "ai" ? "auto-replied" : "replied" };
    if (sender === "ai") updates.ai_handled = true;
    await db.from("contact_submissions").update(updates).eq("id", submissionId);
  }

  return NextResponse.json({ reply: inserted });
}
