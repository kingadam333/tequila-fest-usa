"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, CheckCircle, ChevronLeft, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CONTEST_CATEGORIES, type CategoryKey, type Scores } from "@/lib/contest";

type Entry = { id: string; brand_name: string; myVote: Scores | null };
type ContestEvent = { id: string; city: string; slug: string; date_iso: string; entries: Entry[] };

const ballotAvg = (s: Scores) => (CONTEST_CATEGORIES.reduce((sum, c) => sum + s[c.key], 0) / CONTEST_CATEGORIES.length).toFixed(1);

export default function VotePageClient() {
  const [data, setData] = useState<{ loggedIn: boolean; events: ContestEvent[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [active, setActive] = useState<Entry | null>(null);

  const load = () =>
    fetch("/api/contest", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setLoadError("Couldn't load the contest. Please refresh."));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contest", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) throw new Error(d.error); setData(d); } })
      .catch(() => { if (!cancelled) setLoadError("Couldn't load the contest. Please refresh."); });
    return () => { cancelled = true; };
  }, []);

  const events = data?.events || [];
  const ev = events.find(e => e.id === eventId) || events[0];
  const rated = ev ? ev.entries.filter(e => e.myVote).length : 0;

  return (
    <>
      <Navbar />
      <main className="bg-[#0d0500] min-h-screen pt-24 pb-20">
        <section className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <Trophy size={36} className="text-yellow-400 mx-auto mb-3" />
            <h1 className="font-display text-white text-4xl sm:text-5xl tracking-wider">BEST TABLE CONTEST</h1>
            <p className="text-white/75 mt-2">Rate each brand table from 1 to 10 in five categories. You can update your ratings until voting closes.</p>
          </div>

          {loadError && <p className="text-red-400 text-center">{loadError}</p>}
          {!data && !loadError && <p className="text-white/70 text-center"><Loader2 className="inline animate-spin mr-2" size={16} />Loading…</p>}

          {data && events.length === 0 && (
            <div className="text-center bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-white/80">
              Voting opens at the festival. Scan the QR code at any brand table during the event to vote.
            </div>
          )}

          {data && ev && !data.loggedIn && (
            <div className="text-center bg-white/[0.03] border border-yellow-500/30 rounded-2xl p-8">
              <p className="text-white text-lg font-semibold mb-1">Log in to vote</p>
              <p className="text-white/70 text-sm mb-5">Use the account your tickets are on. One ballot per table per person.</p>
              <Link href="/login?redirect=/vote" className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold tracking-widest text-sm px-6 py-3 rounded-xl">LOG IN</Link>
              <p className="text-white/60 text-xs mt-4">No account? <Link href="/signup" className="text-yellow-400 hover:underline">Sign up</Link></p>
            </div>
          )}

          {data && ev && data.loggedIn && (
            <>
              {events.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2 mb-5">
                  {events.map(e => (
                    <button key={e.id} onClick={() => { setEventId(e.id); setActive(null); }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer ${e.id === ev.id ? "border-yellow-500 text-yellow-400 bg-yellow-500/10" : "border-white/15 text-white/80"}`}>
                      {e.city}
                    </button>
                  ))}
                </div>
              )}

              {active ? (
                <Ballot key={active.id} entry={active} onBack={() => setActive(null)}
                  onSaved={async () => { await load(); setActive(null); }} />
              ) : (
                <>
                  <p className="text-white/70 text-sm text-center mb-4">{ev.city} · You&apos;ve rated {rated} of {ev.entries.length} tables</p>
                  {ev.entries.length === 0 ? (
                    <p className="text-white/70 text-center">Brand tables will appear here shortly.</p>
                  ) : (
                    <div className="space-y-2">
                      {ev.entries.map(e => (
                        <button key={e.id} onClick={() => { setActive(e); window.scrollTo({ top: 0 }); }}
                          className="w-full flex items-center justify-between gap-3 text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl px-5 py-4 cursor-pointer transition-colors">
                          <span className="text-white font-semibold">{e.brand_name}</span>
                          {e.myVote ? (
                            <span className="flex items-center gap-1.5 text-green-400 text-sm flex-shrink-0"><CheckCircle size={16} /> {ballotAvg(e.myVote)} · Edit</span>
                          ) : (
                            <span className="bg-yellow-500 text-black text-xs font-bold tracking-widest rounded-full px-3 py-1 flex-shrink-0">RATE</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Ballot({ entry, onBack, onSaved }: { entry: Entry; onBack: () => void; onSaved: () => Promise<void> }) {
  const [scores, setScores] = useState<Partial<Scores>>(entry.myVote || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const complete = CONTEST_CATEGORIES.every(c => scores[c.key]);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contest/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, scores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save your vote.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your vote.");
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 cursor-pointer"><ChevronLeft size={16} /> All tables</button>
      <h2 className="font-display text-yellow-400 text-3xl tracking-wider mb-5">{entry.brand_name.toUpperCase()}</h2>
      <div className="space-y-5">
        {CONTEST_CATEGORIES.map(c => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-white font-semibold">{c.label}</p>
              <p className="text-yellow-400 font-bold">{scores[c.key] ?? "–"}</p>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                const on = scores[c.key] === n;
                return (
                  <button key={n} type="button" aria-label={`${c.label} ${n}`} aria-pressed={on}
                    onClick={() => setScores(s => ({ ...s, [c.key as CategoryKey]: n }))}
                    className={`h-10 rounded-lg text-sm font-bold touch-manipulation cursor-pointer transition-colors ${on ? "bg-yellow-500 text-black" : "bg-white/5 text-white/80 hover:bg-white/10"}`}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      <button onClick={submit} disabled={!complete || saving}
        className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold tracking-widest py-4 rounded-2xl cursor-pointer disabled:cursor-not-allowed">
        {saving ? "SAVING…" : entry.myVote ? "UPDATE MY VOTE" : "SUBMIT VOTE"}
      </button>
      {!complete && <p className="text-white/50 text-xs text-center mt-2">Rate all five categories to submit.</p>}
    </div>
  );
}
