// Web push sending (admin -> Push). Server-only: uses VAPID_PRIVATE_KEY.
import crypto from "crypto";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/fetchAllRows";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = "mailto:help@mail.tequilafestusa.com";

export type PushSubscriptionRow = {
  id: string; endpoint: string; p256dh: string; auth: string; email: string | null;
};
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/**
 * Whether both VAPID keys are set and form a real pair. The keys were added to
 * Vercel long before any push code existed, so this is checked rather than
 * assumed: a mismatched pair makes every push service reject every send.
 */
export function vapidStatus(): { configured: boolean; keysMatch: boolean } {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return { configured: false, keysMatch: false };
  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(PRIVATE_KEY, "base64url"));
    const derived = ecdh.getPublicKey().toString("base64url");
    return { configured: true, keysMatch: derived === PUBLIC_KEY.replace(/=+$/, "") };
  } catch {
    return { configured: true, keysMatch: false };
  }
}

/** Notification links: a same-site path or an https URL, nothing else. */
export function cleanPushUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Lower-cased emails of everyone holding a paid ticket (comps included: they attend too) for this event. */
export async function eventAttendeeEmails(db: SupabaseClient, eventId: string): Promise<Set<string>> {
  const rows = await fetchAllRows<{ ticket_orders: { customer_email: string | null } }>((from, to) =>
    db
      .from("ticket_instances")
      .select("ticket_orders!inner(customer_email, status)")
      .eq("event_id", eventId)
      .eq("ticket_orders.status", "paid")
      .range(from, to) as unknown as PromiseLike<{ data: { ticket_orders: { customer_email: string | null } }[] | null; error: unknown }>
  );
  const out = new Set<string>();
  for (const r of rows) {
    const e = r.ticket_orders?.customer_email?.trim().toLowerCase();
    if (e) out.add(e);
  }
  return out;
}

export async function allSubscriptions(db: SupabaseClient): Promise<PushSubscriptionRow[]> {
  return fetchAllRows<PushSubscriptionRow>((from, to) =>
    db.from("push_subscriptions").select("id, endpoint, p256dh, auth, email").order("created_at").range(from, to) as unknown as PromiseLike<{ data: PushSubscriptionRow[] | null; error: unknown }>
  );
}

/**
 * Sends to every subscription, 25 at a time. Subscriptions the push service
 * says are gone (404/410: app uninstalled, permission revoked) are deleted so
 * they stop counting as subscribers; other failures bump failure_count.
 */
export async function sendPush(db: SupabaseClient, subs: PushSubscriptionRow[], payload: PushPayload) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  const body = JSON.stringify(payload);
  const sentIds: string[] = [];
  const goneIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  for (const batch of chunk(subs, 25)) {
    const results = await Promise.allSettled(
      batch.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 }))
    );
    results.forEach((r, i) => {
      const s = batch[i];
      if (r.status === "fulfilled") return sentIds.push(s.id);
      const err = r.reason as { statusCode?: number; body?: string; message?: string };
      if (err?.statusCode === 404 || err?.statusCode === 410) return goneIds.push(s.id);
      failedIds.push(s.id);
      if (errors.length < 5) errors.push(`${err?.statusCode ?? "?"} ${(err?.body || err?.message || "").slice(0, 160)}`);
    });
  }

  const now = new Date().toISOString();
  for (const ids of chunk(sentIds, 200)) await db.from("push_subscriptions").update({ last_sent_at: now, failure_count: 0 }).in("id", ids);
  for (const ids of chunk(goneIds, 200)) await db.from("push_subscriptions").delete().in("id", ids);
  if (failedIds.length) {
    const { error } = await db.rpc("increment_push_failures", { p_ids: failedIds });
    if (error) console.error("[push] failure_count update failed:", error.message);
  }
  if (errors.length) console.error("[push] send errors:", errors);

  return { sent: sentIds.length, removed: goneIds.length, failed: failedIds.length, errors };
}
