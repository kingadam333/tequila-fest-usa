"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { currentSubscription, disablePush, enablePush, isIosBrowserTab, pushSupported, syncPush } from "@/lib/pushClient";

// "Turn on notifications" card. Renders nothing on browsers that can't do web
// push at all; on an iPhone browser tab it explains the Home Screen step,
// because iOS only allows push from an installed web app.
type State = "loading" | "unsupported" | "ios-tab" | "denied" | "off" | "on";

export default function PushOptIn({
  heading = "Event-day alerts",
  blurb = "Get a notification for door times, parking and last-minute updates for your city.",
  checkoutSessionId,
}: { heading?: string; blurb?: string; checkoutSessionId?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (isIosBrowserTab()) next = "ios-tab";
      else if (!pushSupported()) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else next = (await currentSubscription().catch(() => null)) && Notification.permission === "granted" ? "on" : "off";
      if (cancelled) return;
      setState(next);
      if (next === "on") syncPush();
    })();
    return () => { cancelled = true; };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setMessage("");
    try {
      await enablePush({ checkoutSessionId });
      setState("on");
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      if (reason === "denied") setState("denied");
      else if (reason !== "dismissed") setMessage("Couldn't turn on notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush().catch(() => {});
    setState("off");
    setBusy(false);
  };

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-white/[0.03] p-5 text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
          <Bell size={18} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold">{heading}</p>
          <p className="text-white/70 text-sm mt-0.5">{blurb}</p>

          {state === "off" && (
            <button onClick={turnOn} disabled={busy}
              className="mt-3 inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2.5 rounded-full cursor-pointer transition-colors">
              <Bell size={15} /> {busy ? "Turning on…" : "Turn on notifications"}
            </button>
          )}
          {state === "on" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-semibold"><Check size={15} /> Notifications are on</span>
              <button onClick={turnOff} disabled={busy} className="inline-flex items-center gap-1 text-white/50 hover:text-white/80 text-xs cursor-pointer">
                <BellOff size={12} /> Turn off
              </button>
            </div>
          )}
          {state === "denied" && (
            <p className="mt-3 text-white/60 text-sm">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload this page.</p>
          )}
          {state === "ios-tab" && (
            <p className="mt-3 text-white/60 text-sm">On iPhone: tap the Share button, choose <strong className="text-white/80">Add to Home Screen</strong>, then open Tequila Fest from your Home Screen to turn notifications on.</p>
          )}
          {message && <p className="mt-2 text-red-400 text-sm">{message}</p>}
        </div>
      </div>
    </div>
  );
}
