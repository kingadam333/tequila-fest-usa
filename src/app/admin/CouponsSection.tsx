"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Pause, Play, Tag, X } from "lucide-react";
import { COUPON_CITY_OPTIONS, describeCoupon, type Coupon } from "@/lib/coupons";

// Admin -> Coupons. Codes buyers enter in the ticket cart ("Have a promo
// code?"). Discounts apply to ticket prices only, never the service fee, and
// are validated server-side at checkout (src/lib/coupons.ts).

type Draft = {
  code: string; type: "percentage" | "fixed"; value: string;
  max_uses: string; max_uses_per_customer: string; min_order_amount: string; max_discount_amount: string;
  applicable_cities: string[]; expires_at: string;
};

const emptyDraft = (): Draft => ({
  code: "", type: "percentage", value: "", max_uses: "", max_uses_per_customer: "1",
  min_order_amount: "", max_discount_amount: "", applicable_cities: [], expires_at: "",
});

// Expiry is stored as end-of-day Eastern; show that day back in the date picker.
const toDateInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : "");

const toDraft = (c: Coupon): Draft => ({
  code: c.code, type: c.type, value: String(c.value),
  max_uses: c.max_uses == null ? "" : String(c.max_uses),
  max_uses_per_customer: String(c.max_uses_per_customer),
  min_order_amount: c.min_order_amount == null ? "" : String(c.min_order_amount),
  max_discount_amount: c.max_discount_amount == null ? "" : String(c.max_discount_amount),
  applicable_cities: c.applicable_cities || [],
  expires_at: toDateInput(c.expires_at),
});

const draftToBody = (d: Draft) => ({
  code: d.code, type: d.type, value: d.value,
  max_uses: d.max_uses, max_uses_per_customer: d.max_uses_per_customer || "0",
  min_order_amount: d.min_order_amount, max_discount_amount: d.type === "percentage" ? d.max_discount_amount : "",
  applicable_cities: d.applicable_cities, expires_at: d.expires_at,
});

function status(c: Coupon): { label: string; cls: string } {
  if (!c.active) return { label: "PAUSED", cls: "text-white/70 border-white/20" };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return { label: "EXPIRED", cls: "text-red-400 border-red-500/30" };
  if (c.max_uses != null && c.uses >= c.max_uses) return { label: "USED UP", cls: "text-red-400 border-red-500/30" };
  return { label: "ACTIVE", cls: "text-green-400 border-green-500/30" };
}

export default function CouponsSection({ adminToken }: { adminToken: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // null | "new" | id
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const headers = { "Content-Type": "application/json", "x-admin-token": adminToken };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/coupons", { headers: { "x-admin-token": adminToken } })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) setCoupons(data.coupons);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adminToken]);

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    return data;
  };

  const save = async () => {
    setError("");
    setBusyId(editing);
    try {
      if (editing === "new") {
        const { coupon } = await request("/api/admin/coupons", "POST", draftToBody(draft));
        setCoupons(prev => [coupon, ...prev]);
      } else if (editing) {
        const { coupon } = await request(`/api/admin/coupons/${editing}`, "PATCH", draftToBody(draft));
        setCoupons(prev => prev.map(c => (c.id === editing ? coupon : c)));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (c: Coupon) => {
    setBusyId(c.id);
    setError("");
    try {
      const { coupon } = await request(`/api/admin/coupons/${c.id}`, "PATCH", { active: !c.active });
      setCoupons(prev => prev.map(x => (x.id === c.id ? coupon : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete ${c.code}? Past orders keep their record of it. To stop it temporarily, use Pause instead.`)) return;
    setBusyId(c.id);
    setError("");
    try {
      await request(`/api/admin/coupons/${c.id}`, "DELETE");
      setCoupons(prev => prev.filter(x => x.id !== c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const input = "w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40";
  const label = "text-white/80 text-xs uppercase tracking-wider block mb-1";
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(d => ({ ...d, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-white text-3xl mb-1">COUPONS</h2>
          <p className="text-white/80 text-sm">Promo codes buyers enter in the ticket cart. Discounts come off ticket prices only, not the service fee.</p>
        </div>
        <button onClick={() => { setDraft(emptyDraft()); setEditing("new"); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer flex-shrink-0">
          <Plus size={14} /> New Coupon
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {editing && (
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">{editing === "new" ? "New Coupon" : `Edit ${draft.code}`}</h3>
            <button onClick={() => setEditing(null)} aria-label="Close" className="text-white/70 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={label}>Code</label>
              <input value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                placeholder="SALUD10" className={`${input} font-mono`} />
            </div>
            <div>
              <label className={label}>Type</label>
              <select value={draft.type} onChange={set("type")} className={`${input} cursor-pointer`}>
                <option value="percentage" className="bg-[#0d0500]">Percent off tickets</option>
                <option value="fixed" className="bg-[#0d0500]">Dollars off tickets</option>
              </select>
            </div>
            <div>
              <label className={label}>{draft.type === "percentage" ? "Percent off" : "Dollars off"}</label>
              <input type="number" min={0} value={draft.value} onChange={set("value")} placeholder={draft.type === "percentage" ? "10" : "5"} className={input} />
            </div>
            <div>
              <label className={label}>Total uses (blank = unlimited)</label>
              <input type="number" min={0} value={draft.max_uses} onChange={set("max_uses")} placeholder="100" className={input} />
            </div>
            <div>
              <label className={label}>Uses per customer (0 = unlimited)</label>
              <input type="number" min={0} value={draft.max_uses_per_customer} onChange={set("max_uses_per_customer")} className={input} />
            </div>
            <div>
              <label className={label}>Expires after (blank = never)</label>
              <input type="date" value={draft.expires_at} onChange={set("expires_at")} className={input} style={{ colorScheme: "dark" }} />
            </div>
            <div>
              <label className={label}>Min. ticket subtotal $ (optional)</label>
              <input type="number" min={0} value={draft.min_order_amount} onChange={set("min_order_amount")} className={input} />
            </div>
            {draft.type === "percentage" && (
              <div>
                <label className={label}>Max discount $ (optional)</label>
                <input type="number" min={0} value={draft.max_discount_amount} onChange={set("max_discount_amount")} className={input} />
              </div>
            )}
          </div>
          <div>
            <p className={label}>Valid for (none selected = every city)</p>
            <div className="flex flex-wrap gap-2">
              {COUPON_CITY_OPTIONS.map(c => {
                const on = draft.applicable_cities.includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setDraft(d => ({ ...d, applicable_cities: on ? d.applicable_cities.filter(x => x !== c.id) : [...d.applicable_cities, c.id] }))}
                    className={`text-sm rounded-lg border px-3 py-1.5 cursor-pointer ${on ? "border-yellow-500/50 bg-yellow-500/15 text-yellow-300" : "border-white/10 text-white/80 hover:border-white/25"}`}>
                    {on ? "✓ " : ""}{c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-white/80 hover:text-white text-sm px-4 py-2 cursor-pointer">Cancel</button>
            <button onClick={save} disabled={busyId !== null || !draft.code || !draft.value}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2 rounded-xl cursor-pointer disabled:cursor-not-allowed">
              {busyId ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-white/70 text-sm">Loading…</p>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-white/80 border border-dashed border-white/10 rounded-2xl">
          <Tag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-white/80 mb-1">No coupons yet</p>
          <p className="text-sm">Click New Coupon to create your first promo code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(c => {
            const st = status(c);
            const busy = busyId === c.id;
            return (
              <div key={c.id} className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-wrap items-center justify-between gap-3 ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-white font-bold text-lg">{c.code}</span>
                    <span className={`text-[10px] font-bold tracking-widest border rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                  </p>
                  <p className="text-yellow-400 text-sm">
                    {describeCoupon(c)}
                    {c.max_discount_amount != null && c.type === "percentage" ? ` (max $${Number(c.max_discount_amount).toFixed(2)})` : ""}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    Used {c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    {" · "}{c.max_uses_per_customer > 0 ? `${c.max_uses_per_customer} per customer` : "unlimited per customer"}
                    {" · "}{c.applicable_cities?.length ? c.applicable_cities.map(id => COUPON_CITY_OPTIONS.find(o => o.id === id)?.label ?? id).join(", ") : "All cities"}
                    {c.min_order_amount != null ? ` · min $${Number(c.min_order_amount).toFixed(2)}` : ""}
                    {c.expires_at ? ` · expires ${toDateInput(c.expires_at)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button title={c.active ? "Pause" : "Resume"} onClick={() => toggleActive(c)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
                    {c.active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button title="Edit" onClick={() => { setDraft(toDraft(c)); setEditing(c.id); }} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"><Edit2 size={16} /></button>
                  <button title="Delete" onClick={() => remove(c)} className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/5 cursor-pointer"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
