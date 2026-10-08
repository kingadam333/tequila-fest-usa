"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Send, Smartphone, AlertTriangle } from "lucide-react";
import { currentSubscription, enablePush, isIosBrowserTab, pushSupported } from "@/lib/pushClient";

// Admin -> Push: send a web push notification to everyone who turned them on,
// or only to ticket holders of one event. Customers opt in on /account and the
// ticket confirmation page.

type PushEvent = { id: string; city: string; date_iso: string; status: string; subscribers: number };
type Campaign = { id: string; title: string; body: string; url: string | null; audience_label: string | null; targeted: number; sent: number; failed: number; removed: number; created_at: string };
type Data = { vapid: { configured: boolean; keysMatch: boolean }; total: number; loggedIn: number; events: PushEvent[]; campaigns: Campaign[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtWhen = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function PushSection({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [deviceEndpoint, setDeviceEndpoint] = useState<string | null>(null);
  // Browser capability is only known after mount; reading it during render would differ from the server HTML.
  const [deviceSupport, setDeviceSupport] = useState<"unknown" | "yes" | "ios-tab" | "no">("unknown");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/push", { headers: { "x-admin-token": adminToken }, cache: "no-store" });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Failed to load");
    return d as Data;
  }, [adminToken]);

  useEffect(() => {
    let cancelled = false;
    load().then(d => { if (!cancelled) setData(d); }).catch(err => { if (!cancelled) setError(err.message); });
    currentSubscription()
      .catch(() => null)
      .then(s => {
        if (cancelled) return;
        setDeviceEndpoint(s?.endpoint || null);
        setDeviceSupport(isIosBrowserTab() ? "ios-tab" : pushSupported() ? "yes" : "no");
      });
    return () => { cancelled = true; };
  }, [load]);

  const send = async (aud: string) => {
    setResult("");
    setError("");
    if (!title.trim() || !body.trim()) { setError("Add a title and a message first."); return; }
    const target = aud === "test" ? "this device" : aud === "all" ? `all ${data?.total ?? ""} subscribed devices` : `${data?.events.find(e => `event:${e.id}` === aud)?.city} ticket holders`;
    if (aud !== "test" && !confirm(`Send "${title.trim()}" to ${target}?`)) return;
    setBusy(aud === "test" ? "test" : "send");
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ title, body, url: url.trim() || undefined, audience: aud, endpoint: deviceEndpoint }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Send failed");
      setResult(`Sent to ${d.sent} of ${d.targeted} device${d.targeted === 1 ? "" : "s"}${d.removed ? ` · ${d.removed} expired removed` : ""}${d.failed ? ` · ${d.failed} failed` : ""}.`);
      setData(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  };

  const enableHere = async () => {
    setError("");
    setBusy("device");
    try {
      const sub = await enablePush();
      setDeviceEndpoint(sub.endpoint);
      setData(await load());
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      setError(reason === "denied" ? "Notifications are blocked for this site in this browser's settings." : reason === "dismissed" ? "" : "Couldn't turn on notifications on this device.");
    } finally {
      setBusy(null);
    }
  };

  const inputCls = "w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-white text-3xl mb-1">PUSH NOTIFICATIONS</h2>
        <p className="text-white/80 text-sm">Customers turn these on from their account page or the ticket confirmation page. On iPhone they must add the site to their Home Screen first.</p>
      </div>

      {data && (!data.vapid.configured || !data.vapid.keysMatch) && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300 flex gap-2">
          <AlertTriangle size={18} className="flex-shrink-0" />
          {data.vapid.configured
            ? "NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel are not a matching pair, so every send would be rejected. Generate a new pair and redeploy."
            : "VAPID keys are missing in Vercel."}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-display text-white text-3xl">{data.total}</p>
            <p className="text-white/70 text-sm">Subscribed devices</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-display text-white text-3xl">{data.loggedIn}</p>
            <p className="text-white/70 text-sm">Linked to a customer (can be targeted by event)</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <p className="text-white font-bold flex items-center gap-2"><Bell size={16} className="text-yellow-400" /> New notification</p>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Title — e.g. Doors open at 5pm!" className={inputCls} />
        <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={300} rows={3} placeholder="Message" className={inputCls} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link when tapped (optional) — e.g. /events/cleveland" className={inputCls} />
        <div>
          <label className="text-white/60 text-xs uppercase tracking-wider">Send to</label>
          <select value={audience} onChange={e => setAudience(e.target.value)} className={`${inputCls} mt-1 cursor-pointer`}>
            <option value="all" className="bg-black">Everyone ({data?.total ?? 0} devices)</option>
            {data?.events.map(e => (
              <option key={e.id} value={`event:${e.id}`} className="bg-black">{e.city} ticket holders · {fmtDate(e.date_iso)} ({e.subscribers} devices)</option>
            ))}
          </select>
        </div>
        <p className="text-white/50 text-xs">{title.length}/80 · {body.length}/300 — keep it short; phones cut long messages off.</p>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <p className="text-green-400 text-sm">{result}</p>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={() => send(audience)} disabled={busy !== null}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer">
            <Send size={15} /> {busy === "send" ? "Sending…" : "Send"}
          </button>
          {deviceEndpoint ? (
            <button onClick={() => send("test")} disabled={busy !== null}
              className="inline-flex items-center gap-2 border border-white/15 text-white/80 hover:text-white text-sm px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50">
              <Smartphone size={15} /> {busy === "test" ? "Sending…" : "Send test to this device"}
            </button>
          ) : deviceSupport === "unknown" ? null : deviceSupport === "yes" ? (
            <button onClick={enableHere} disabled={busy !== null}
              className="inline-flex items-center gap-2 border border-white/15 text-white/80 hover:text-white text-sm px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50">
              <Smartphone size={15} /> {busy === "device" ? "Turning on…" : "Turn on notifications on this device (for tests)"}
            </button>
          ) : (
            <span className="text-white/50 text-xs self-center">
              {deviceSupport === "ios-tab" ? "To test on iPhone, add the site to your Home Screen and open admin from there." : "This browser can't receive push notifications."}
            </span>
          )}
        </div>
      </div>

      {data && data.campaigns.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-white font-bold mb-3">Sent</p>
          <div className="space-y-3">
            {data.campaigns.map(c => (
              <div key={c.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-white font-semibold text-sm">{c.title}</p>
                  <p className="text-white/50 text-xs">{fmtWhen(c.created_at)}</p>
                </div>
                <p className="text-white/70 text-sm">{c.body}</p>
                <p className="text-white/50 text-xs mt-1">
                  {c.audience_label} · {c.sent}/{c.targeted} delivered{c.failed ? ` · ${c.failed} failed` : ""}{c.removed ? ` · ${c.removed} expired` : ""}{c.url ? ` · → ${c.url}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
