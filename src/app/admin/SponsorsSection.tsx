"use client";

import { useEffect, useState } from "react";
import SponsorReservationsPanel from "./SponsorReservationsPanel";
import { Plus, Edit2, Trash2, Eye, EyeOff, X, ExternalLink } from "lucide-react";
import { sponsorEventOptions, type SponsorPackage } from "@/lib/sponsorPackages";

// Admin -> Sponsors. Two tabs:
//   Requests — reservations from "Reserve This" on /sponsors (SponsorReservationsPanel)
//   Packages — the sponsor packages shown on /sponsors and /brand-packages. Changes
//              show on the public pages on the next load (they render per request).

type Draft = { name: string; price_per_event: string; blurb: string; features: string; sort_order: string; per_city: boolean };

const emptyDraft = (sortOrder: number): Draft => ({ name: "", price_per_event: "", blurb: "", features: "", sort_order: String(sortOrder), per_city: false });

const toDraft = (p: SponsorPackage): Draft => ({
  name: p.name,
  price_per_event: String(p.price_per_event),
  blurb: p.blurb,
  features: p.features.join("\n"),
  sort_order: String(p.sort_order),
  per_city: p.per_city,
});

const draftToBody = (d: Draft) => ({
  name: d.name,
  price_per_event: Number(d.price_per_event),
  blurb: d.blurb,
  features: d.features.split("\n"),
  sort_order: Number(d.sort_order || 0),
  per_city: d.per_city,
});

export default function SponsorsSection({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<"requests" | "packages">("requests");
  const [pending, setPending] = useState(0);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-white text-3xl mb-1">SPONSORS</h2>
        <p className="text-white/80 text-sm">Review sponsorship requests and manage the packages shown on /sponsors and /brand-packages.</p>
      </div>
      <div className="flex gap-2 border-b border-white/10">
        {([["requests", "Requests"], ["packages", "Packages"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-semibold cursor-pointer border-b-2 -mb-px transition-all ${tab === id ? "border-yellow-500 text-yellow-400" : "border-transparent text-white/70 hover:text-white"}`}>
            {label}
            {id === "requests" && pending > 0 && <span className="ml-2 text-[10px] font-bold bg-yellow-500 text-black rounded-full px-1.5 py-0.5">{pending}</span>}
          </button>
        ))}
      </div>
      {/* Both stay mounted so the pending badge stays accurate on either tab. */}
      <div className={tab === "requests" ? "" : "hidden"}><SponsorReservationsPanel adminToken={adminToken} onPendingCount={setPending} /></div>
      <div className={tab === "packages" ? "" : "hidden"}><PackagesPanel adminToken={adminToken} /></div>
    </div>
  );
}

function PackagesPanel({ adminToken }: { adminToken: string }) {
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // null = closed; "new" = creating; otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));

  const headers = { "Content-Type": "application/json", "x-admin-token": adminToken };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/sponsor-packages", { headers: { "x-admin-token": adminToken } })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) setPackages(data.packages);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adminToken]);

  const patch = async (id: string, body: Partial<SponsorPackage>) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/sponsor-packages/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPackages(prev => prev.map(p => (p.id === id ? data.package : p)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const toggleSold = (p: SponsorPackage, eventId: string) => {
    const sold = p.sold_events.includes(eventId)
      ? p.sold_events.filter(e => e !== eventId)
      : [...p.sold_events, eventId];
    patch(p.id, { sold_events: sold });
  };

  const openNew = () => {
    setDraft(emptyDraft(packages.length ? Math.max(...packages.map(p => p.sort_order)) + 1 : 1));
    setEditing("new");
  };

  const saveDraft = async () => {
    setError("");
    if (editing === "new") {
      setBusyId("new");
      try {
        const res = await fetch("/api/admin/sponsor-packages", { method: "POST", headers, body: JSON.stringify(draftToBody(draft)) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        setPackages(prev => [...prev, data.package].sort((a, b) => a.sort_order - b.sort_order));
        setEditing(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setBusyId(null);
      }
    } else if (editing) {
      if (await patch(editing, draftToBody(draft) as Partial<SponsorPackage>)) {
        setPackages(prev => [...prev].sort((a, b) => a.sort_order - b.sort_order));
        setEditing(null);
      }
    }
  };

  const remove = async (p: SponsorPackage) => {
    if (!confirm(`Delete "${p.name}"? This removes it from the site permanently. To take it down temporarily, use Hide instead.`)) return;
    setBusyId(p.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/sponsor-packages/${p.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setPackages(prev => prev.filter(x => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const input = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-white/80 text-sm">
            Mark each event sold or available, hide a package, or edit its details. Paid reservations mark their events sold automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/sponsors#tiers" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-white text-xs font-bold tracking-wider px-3 py-2 rounded-xl transition-all">
            <ExternalLink size={14} /> VIEW ON SITE
          </a>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold tracking-wider px-3 py-2 rounded-xl transition-all cursor-pointer">
            <Plus size={14} /> NEW PACKAGE
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">{error}</p>}

      {editing && (
        <div className="bg-white/[0.04] border border-yellow-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold">{editing === "new" ? "New sponsor package" : "Edit package"}</p>
            <button onClick={() => setEditing(null)} className="text-white/70 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1">Name *</label>
              <input className={input} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Official Tequila" />
            </div>
            <div>
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1">Price per event ($) *</label>
              <input className={input} inputMode="numeric" value={draft.price_per_event} onChange={e => setDraft(d => ({ ...d, price_per_event: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="1500" />
            </div>
          </div>
          <p className="text-white/50 text-xs -mt-1">Ohio covers three events, so the site shows Ohio at 3× this price.</p>
          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1">Short description</label>
            <input className={input} value={draft.blurb} onChange={e => setDraft(d => ({ ...d, blurb: e.target.value }))} placeholder="Title beverage partner" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1">What&apos;s included (one per line)</label>
              <textarea className={`${input} resize-y`} rows={4} value={draft.features} onChange={e => setDraft(d => ({ ...d, features: e.target.value }))} placeholder={"5 Case Commitment\nLogo on koozies"} />
            </div>
            <div>
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1">Display order</label>
              <input className={input} inputMode="numeric" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: e.target.value.replace(/[^0-9-]/g, "") }))} />
              <p className="text-white/50 text-xs mt-1">Lower numbers show first.</p>
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={draft.per_city} onChange={e => setDraft(d => ({ ...d, per_city: e.target.checked }))} className="accent-yellow-500 mt-1" />
            <span>
              <span className="text-white text-sm">Sell by individual city</span>
              <span className="block text-white/50 text-xs">Buyers pick Cleveland, Cincinnati, Columbus or Phoenix. Unchecked = Ohio sold as one bundle of all three, plus Phoenix. Sold markers don&apos;t carry over if you switch.</span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-white/80 hover:text-white text-sm px-4 py-2 cursor-pointer">Cancel</button>
            <button onClick={saveDraft} disabled={busyId !== null || !draft.name.trim() || draft.price_per_event === ""}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2 rounded-xl cursor-pointer disabled:cursor-not-allowed">
              {busyId ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-white/80 text-sm">Loading…</p>
      ) : packages.length === 0 ? (
        <p className="text-white/80 text-sm">No sponsor packages yet. The Become a Sponsor section is hidden on the site until you add one.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {packages.map(p => {
            const busy = busyId === p.id;
            return (
              <div key={p.id} className={`rounded-2xl border p-5 transition-opacity ${p.is_active ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"} ${busy ? "pointer-events-none opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-lg flex items-center gap-2">
                      {p.name}
                      {!p.is_active && <span className="text-[10px] font-bold tracking-widest text-white/70 border border-white/20 rounded-full px-2 py-0.5">HIDDEN</span>}
                    </p>
                    <p className="text-yellow-400 font-display text-2xl">${p.price_per_event.toLocaleString()}<span className="text-white/60 text-sm font-sans"> / event</span></p>
                    {p.blurb && <p className="text-white/70 text-sm">{p.blurb}</p>}
                    <p className="text-white/50 text-xs mt-1">{p.per_city ? "Sold by individual city" : "Ohio bundle + Phoenix"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button title={p.is_active ? "Hide from site" : "Show on site"} onClick={() => patch(p.id, { is_active: !p.is_active })}
                      className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
                      {p.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button title="Edit" onClick={() => { setDraft(toDraft(p)); setEditing(p.id); }}
                      className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"><Edit2 size={16} /></button>
                    <button title="Delete" onClick={() => remove(p)}
                      className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/5 cursor-pointer"><Trash2 size={16} /></button>
                  </div>
                </div>

                {p.features.length > 0 && (
                  <ul className="mt-3 text-white/60 text-xs space-y-0.5 list-disc list-inside">
                    {p.features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                )}

                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Availability · click to change</p>
                  <div className="flex flex-wrap gap-2">
                    {sponsorEventOptions(p.per_city).map(ev => {
                      const sold = p.sold_events.includes(ev.id);
                      return (
                        <button key={ev.id} onClick={() => toggleSold(p, ev.id)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${sold ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
                          {ev.label}
                          <span className="text-[10px] font-bold tracking-widest">{sold ? "SOLD" : "AVAILABLE"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
