"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, Trash2, Download, ExternalLink, Plus } from "lucide-react";
import { CONTEST_CATEGORIES, MIN_VOTES, type EntryResult } from "@/lib/contest";

// Admin -> Contest: Best Table Contest. Per event: open/close voting at /vote,
// manage the brand tables, and watch live results. The QR code at every table
// points to https://www.tequilafestusa.com/vote.

type ContestEvent = {
  id: string; city: string; slug: string; date_iso: string; status: string; contest_open: boolean;
  results: EntryResult[]; winner: EntryResult | null; voters: number;
};
type OhioWinner = { city: string; brand: string; score: number | null; votes: number } | null;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function ContestSection({ adminToken }: { adminToken: string }) {
  const [events, setEvents] = useState<ContestEvent[]>([]);
  const [ohio, setOhio] = useState<Record<string, OhioWinner>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/contest", { headers: { "x-admin-token": adminToken }, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    return data as { events: ContestEvent[]; ohioByYear: Record<string, OhioWinner> };
  }, [adminToken]);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then(d => { if (!cancelled) { setEvents(d.events); setOhio(d.ohioByYear); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchData]);

  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/admin/contest", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": adminToken }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      const d = await fetchData();
      setEvents(d.events);
      setOhio(d.ohioByYear);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const ohioYears = Object.entries(ohio).filter(([, w]) => w);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-white text-3xl mb-1">BEST TABLE CONTEST</h2>
          <p className="text-white/80 text-sm max-w-2xl">
            Attendees log in at <span className="font-mono text-yellow-400">/vote</span> (one QR code at every table) and rate each brand 1–10 in five categories.
            Score = average of all ratings. A table needs {MIN_VOTES} votes to be eligible.
          </p>
        </div>
        <a href="/vote" target="_blank" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white border border-white/15 rounded-xl px-3 py-2">
          <ExternalLink size={14} /> Open voting page
        </a>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {ohioYears.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          {ohioYears.map(([year, w]) => (
            <p key={year} className="text-white text-sm flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              <span><strong className="text-yellow-400">Ohio {year} leader:</strong> {w!.brand} ({w!.city}) · {w!.score?.toFixed(2)} avg · {w!.votes} votes</span>
            </p>
          ))}
          <p className="text-white/60 text-xs mt-1">Best of the Ohio city winners so far. Final once all three Ohio events have voted.</p>
        </div>
      )}

      {loading ? <p className="text-white/70 text-sm">Loading…</p> : events.length === 0 ? (
        <p className="text-white/70 text-sm">No upcoming or recent events.</p>
      ) : events.map(ev => (
        <div key={ev.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-white font-bold text-lg">{ev.city} <span className="text-white/60 font-normal text-sm">· {fmtDate(ev.date_iso)}</span></p>
              <p className="text-white/60 text-xs">{ev.results.length} tables · {ev.voters} voters</p>
            </div>
            <button disabled={busy !== null} onClick={() => act(`open-${ev.id}`, { action: "set_open", eventId: ev.id, open: !ev.contest_open })}
              className={`rounded-xl border px-4 py-2 text-sm font-bold cursor-pointer disabled:opacity-50 ${ev.contest_open ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/15 text-white/80 hover:text-white"}`}>
              {ev.contest_open ? "● VOTING OPEN — click to close" : "Voting closed — click to open"}
            </button>
          </div>

          {ev.winner && (
            <p className="text-sm text-white mb-3 flex items-center gap-2"><Trophy size={15} className="text-yellow-400" /> Leading: <strong>{ev.winner.brand}</strong> · {ev.winner.score?.toFixed(2)} avg · {ev.winner.votes} votes</p>
          )}

          {ev.results.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-white/60 text-xs uppercase tracking-wider text-left">
                    <th className="py-2 pr-2">Brand</th>
                    <th className="py-2 px-2 text-right">Score</th>
                    <th className="py-2 px-2 text-right">Votes</th>
                    {CONTEST_CATEGORIES.map(c => <th key={c.key} className="py-2 px-2 text-right whitespace-nowrap">{c.label.replace("Overall Best Experience", "Overall").replace("Tequila ", "").replace("Table ", "")}</th>)}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ev.results.map(r => (
                    <tr key={r.entryId} className={`border-t border-white/5 ${r.eligible ? "text-white" : "text-white/55"}`}>
                      <td className="py-2 pr-2 font-semibold">{r.brand}{!r.eligible && r.votes > 0 && <span className="ml-2 text-[10px] text-white/50">needs {MIN_VOTES - r.votes} more</span>}</td>
                      <td className="py-2 px-2 text-right font-bold text-yellow-400">{r.score?.toFixed(2) ?? "–"}</td>
                      <td className="py-2 px-2 text-right">{r.votes}</td>
                      {CONTEST_CATEGORIES.map(c => <td key={c.key} className="py-2 px-2 text-right">{r.categories[c.key]?.toFixed(1) ?? "–"}</td>)}
                      <td className="py-2 pl-2 text-right">
                        <button title={r.votes ? "Remove (deletes its votes)" : "Remove"} disabled={busy !== null}
                          onClick={() => { if (confirm(r.votes ? `Remove ${r.brand}? Its ${r.votes} votes will be deleted.` : `Remove ${r.brand}?`)) act(`rm-${r.entryId}`, { action: "remove_entry", entryId: r.entryId }); }}
                          className="text-white/50 hover:text-red-400 cursor-pointer disabled:opacity-50"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input value={newBrand[ev.id] || ""} onChange={e => setNewBrand(m => ({ ...m, [ev.id]: e.target.value }))}
              onKeyDown={async e => { if (e.key === "Enter" && newBrand[ev.id]?.trim()) { if (await act(`add-${ev.id}`, { action: "add_entry", eventId: ev.id, brand: newBrand[ev.id] })) setNewBrand(m => ({ ...m, [ev.id]: "" })); } }}
              placeholder="Add brand table…" className="flex-1 min-w-[180px] bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/40" />
            <button disabled={busy !== null || !newBrand[ev.id]?.trim()}
              onClick={async () => { if (await act(`add-${ev.id}`, { action: "add_entry", eventId: ev.id, brand: newBrand[ev.id] })) setNewBrand(m => ({ ...m, [ev.id]: "" })); }}
              className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:cursor-not-allowed">
              <Plus size={14} /> Add
            </button>
            <button disabled={busy !== null}
              onClick={async () => { const d = await act(`imp-${ev.id}`, { action: "import_paid", eventId: ev.id }); if (d) alert(d.added ? `Added ${d.added} paid brand${d.added === 1 ? "" : "s"}.` : "No new paid brands for this city."); }}
              className="flex items-center gap-1.5 border border-white/15 text-white/80 hover:text-white text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50">
              <Download size={14} /> Import paid brands
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
