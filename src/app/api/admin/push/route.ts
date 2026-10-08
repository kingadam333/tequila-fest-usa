import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { allSubscriptions, cleanPushUrl, eventAttendeeEmails, sendPush, vapidStatus } from "@/lib/push";

export const maxDuration = 60;

type EventRow = { id: string; city: string; date_iso: string; status: string };

async function pushEvents(db: SupabaseClient): Promise<EventRow[]> {
  // Upcoming events plus the last week's, so a "thanks for coming" push still works.
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data } = await db
    .from("events")
    .select("id, city, date_iso, status")
    .gte("date_iso", since)
    .not("status", "in", '("draft","cancelled")')
    .order("date_iso");
  return data || [];
}

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as unknown as SupabaseClient;
  try {
    const [subs, events, campaigns] = await Promise.all([
      allSubscriptions(db),
      pushEvents(db),
      db.from("push_campaigns").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    const subEmails = subs.map((s) => s.email).filter(Boolean) as string[];
    const eventsWithCounts = await Promise.all(
      events.map(async (e) => {
        const attendees = await eventAttendeeEmails(db, e.id);
        return { ...e, subscribers: subEmails.filter((em) => attendees.has(em)).length };
      })
    );
    return NextResponse.json({
      vapid: vapidStatus(),
      total: subs.length,
      loggedIn: subEmails.length,
      events: eventsWithCounts,
      campaigns: campaigns.data || [],
    });
  } catch (err) {
    console.error("[admin/push] GET failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load push data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as unknown as SupabaseClient;
  const b = await req.json().catch(() => ({}));

  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 300) : "";
  if (!title || !body) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  const url = b.url ? cleanPushUrl(b.url) : null;
  if (b.url && !url) return NextResponse.json({ error: "Link must be a page on the site (/events/cleveland) or an https:// URL" }, { status: 400 });

  const vapid = vapidStatus();
  if (!vapid.configured) return NextResponse.json({ error: "VAPID keys are not set in Vercel" }, { status: 500 });
  if (!vapid.keysMatch) return NextResponse.json({ error: "The two VAPID keys in Vercel are not a matching pair — sends would be rejected" }, { status: 500 });

  const audience = typeof b.audience === "string" ? b.audience : "";
  let subs = await allSubscriptions(db);
  let label = "Everyone";

  if (audience === "test") {
    if (typeof b.endpoint !== "string") return NextResponse.json({ error: "Turn on notifications on this device first" }, { status: 400 });
    subs = subs.filter((s) => s.endpoint === b.endpoint);
    if (!subs.length) return NextResponse.json({ error: "This device's subscription wasn't found — turn notifications off and on again" }, { status: 400 });
    label = "Test (this device)";
  } else if (audience.startsWith("event:")) {
    const eventId = audience.slice(6);
    const { data: ev } = await db.from("events").select("id, city, date_iso").eq("id", eventId).maybeSingle();
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 400 });
    const attendees = await eventAttendeeEmails(db, ev.id);
    subs = subs.filter((s) => s.email && attendees.has(s.email));
    label = `${ev.city} ticket holders (${String(ev.date_iso).slice(0, 10)})`;
  } else if (audience !== "all") {
    return NextResponse.json({ error: "Pick who to send to" }, { status: 400 });
  }

  if (!subs.length) return NextResponse.json({ error: "Nobody in that audience has notifications turned on yet" }, { status: 400 });

  const result = await sendPush(db, subs, { title, body, url: url || "/" });
  const { error: logError } = await db.from("push_campaigns").insert({
    title, body, url, audience, audience_label: label,
    targeted: subs.length, sent: result.sent, failed: result.failed, removed: result.removed,
  });
  if (logError) console.error("[admin/push] campaign log failed:", logError.message);

  return NextResponse.json({ ok: true, targeted: subs.length, ...result });
}
