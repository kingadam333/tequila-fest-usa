"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Ticket, Gift } from "lucide-react";

interface Allocation {
  id: string;
  event_id: string;
  ticket_type: string;
  quota: number;
  issued_count: number;
  events: { city: string; state: string; date: string; slug: string; status: string } | null;
}

export default function MediaDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [partner, setPartner] = useState<{ companyName: string; contactName: string; email: string } | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [winnerName, setWinnerName] = useState("");
  const [winnerEmail, setWinnerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const fetchAllocations = useCallback((tok: string) => {
    fetch("/api/media/allocations", { headers: { "x-media-token": tok } })
      .then(r => r.json())
      .then(d => { setAllocations(d.allocations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const tok = localStorage.getItem("media_token");
    const p = localStorage.getItem("media_partner");
    if (!tok) { router.push("/media/login"); return; }
    setToken(tok);
    if (p) setPartner(JSON.parse(p));
    fetchAllocations(tok);
  }, [router, fetchAllocations]);

  const handleLogout = () => {
    localStorage.removeItem("media_token");
    localStorage.removeItem("media_partner");
    router.push("/media/login");
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !token) return;
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch("/api/media/issue-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-media-token": token },
        body: JSON.stringify({ allocationId: selected.id, winnerName, winnerEmail, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ Ticket(s) sent to ${winnerEmail} — Order ${data.orderNumber}`);
        setWinnerName(""); setWinnerEmail(""); setQuantity(1);
        fetchAllocations(token);
      } else {
        setStatus(`Error: ${data.error || "failed to issue ticket"}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e?.message || "failed to issue ticket"}`);
    }
    setSubmitting(false);
  };

  if (loading) return <main className="min-h-screen bg-[#0d0500] flex items-center justify-center text-white/30">Loading…</main>;

  return (
    <main className="min-h-screen bg-[#0d0500] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-1">Media Partner Portal</p>
            <h1 className="font-display text-white text-3xl">{partner?.companyName || "Dashboard"}</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-white/40 hover:text-white text-sm cursor-pointer">
            <LogOut size={16} /> Log Out
          </button>
        </div>

        {allocations.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center text-white/40">
            No ticket allocations yet. Contact Tequila Fest USA to get set up with tickets to give away.
          </div>
        ) : (
          <div className="grid gap-4">
            {allocations.map(a => {
              const remaining = a.quota - a.issued_count;
              return (
                <button key={a.id} onClick={() => setSelected(a)}
                  className={`text-left bg-white/[0.03] border rounded-2xl p-5 transition-all cursor-pointer ${selected?.id === a.id ? "border-yellow-500/50 bg-yellow-500/5" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-lg">{a.events?.city || "Event"}, {a.events?.state}</p>
                      <p className="text-white/40 text-sm">{a.events?.date} · {a.ticket_type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-2xl ${remaining > 0 ? "text-yellow-400" : "text-red-400"}`}>{remaining}</p>
                      <p className="text-white/30 text-xs uppercase tracking-wider">remaining / {a.quota}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <form onSubmit={handleIssue} className="mt-8 bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={18} className="text-yellow-400" />
              <h2 className="text-white font-bold">Issue {selected.ticket_type} — {selected.events?.city}</h2>
            </div>
            {status && (
              <div className={`text-sm rounded-xl px-4 py-3 ${status.startsWith("Error") ? "bg-red-900/30 border border-red-500/40 text-red-400" : "bg-green-900/20 border border-green-500/30 text-green-400"}`}>
                {status}
              </div>
            )}
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Winner Name *</label>
              <input value={winnerName} onChange={e => setWinnerName(e.target.value)} required
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm" />
            </div>
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Winner Email *</label>
              <input type="email" value={winnerEmail} onChange={e => setWinnerEmail(e.target.value)} required
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm" />
            </div>
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Quantity</label>
              <input type="number" min={1} max={selected.quota - selected.issued_count} value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none text-sm" />
            </div>
            <button type="submit" disabled={submitting || selected.quota - selected.issued_count <= 0}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition-all cursor-pointer">
              <Ticket size={16} /> {submitting ? "Sending..." : "Send Ticket to Winner"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
