"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SITE_URL = "https://www.tequilafestusa.com";

interface CityBreakdown { orders: number; tickets: number; sales: number; commission: number }
interface MeData {
  affiliate: { first_name: string; last_name: string | null; email: string; referral_code: string; commission_rate: number };
  refLink: string | null;
  destinationUrl: string | null;
  clicks: number;
  orders: number;
  tickets: number;
  totalSales: number;
  totalCommission: number;
  totalPaid: number;
  balanceOwed: number;
  byCity: Record<string, CityBreakdown>;
  payouts: { amount: number; note: string | null; paid_at: string }[];
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [cityOptions, setCityOptions] = useState<{ label: string; url: string }[]>([]);
  const [destDraft, setDestDraft] = useState("");
  const [destSaving, setDestSaving] = useState(false);
  const [destStatus, setDestStatus] = useState("");

  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(d => {
      setCityOptions((d.events || []).map((e: any) => ({ label: `Tequila Fest ${e.city}`, url: `${SITE_URL}/events/${e.slug}` })));
    }).catch(() => {});
  }, []);

  const saveDestination = async () => {
    const token = localStorage.getItem("affiliate_token");
    if (!token || !destDraft) return;
    setDestSaving(true);
    setDestStatus("");
    try {
      const res = await fetch("/api/affiliate/link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-affiliate-token": token },
        body: JSON.stringify({ destinationUrl: destDraft }),
      });
      if (res.ok) {
        setDestStatus("Updated!");
        load();
        setTimeout(() => setDestStatus(""), 1500);
      } else {
        const d = await res.json();
        setDestStatus(`Error: ${d.error || "failed"}`);
      }
    } catch {
      setDestStatus("Network error");
    }
    setDestSaving(false);
  };

  const load = useCallback(async () => {
    const token = localStorage.getItem("affiliate_token");
    if (!token) { router.push("/affiliate/login"); return; }
    try {
      const res = await fetch("/api/affiliate/me", { headers: { "x-affiliate-token": token } });
      if (res.status === 401) { localStorage.removeItem("affiliate_token"); router.push("/affiliate/login"); return; }
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || "Failed to load");
    } catch {
      setError("Network error");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data?.destinationUrl && !destDraft) setDestDraft(data.destinationUrl);
  }, [data, destDraft]);

  const logout = () => {
    localStorage.removeItem("affiliate_token");
    localStorage.removeItem("affiliate");
    router.push("/affiliate/login");
  };

  const copyLink = () => {
    if (!data?.refLink) return;
    navigator.clipboard.writeText(data.refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <main className="min-h-screen bg-[#0d0500] flex items-center justify-center text-white/40 text-sm">Loading…</main>;
  }
  if (error || !data) {
    return <main className="min-h-screen bg-[#0d0500] flex items-center justify-center text-red-400 text-sm">{error || "Something went wrong"}</main>;
  }

  const qrUrl = data.refLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(data.refLink)}`
    : null;

  const cities = Object.entries(data.byCity).sort((a, b) => b[1].commission - a[1].commission);

  return (
    <main className="min-h-screen bg-[#0d0500] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={44} height={44} className="w-11 h-11" />
            <div>
              <p className="text-white font-bold">{data.affiliate.first_name} {data.affiliate.last_name || ""}</p>
              <p className="text-white/30 text-xs">{data.affiliate.commission_rate}% commission</p>
            </div>
          </div>
          <button onClick={logout} className="text-white/40 hover:text-white text-sm cursor-pointer">Log Out</button>
        </div>

        {/* Referral link + QR */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
          {qrUrl && (
            <img src={qrUrl} alt="Your QR code" width={140} height={140} className="rounded-xl border-2 border-white flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-1.5">Your Referral Link</p>
            <p className="text-yellow-400 font-mono text-lg break-all mb-3">{data.refLink}</p>
            <button onClick={copyLink}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-all cursor-pointer">
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <p className="text-white/25 text-xs mt-3">Share this link or your QR code anywhere — every ticket sale through it is tracked automatically, broken down by city below.</p>

            <div className="mt-4 pt-4 border-t border-white/10">
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Send People To</label>
              <div className="flex items-center gap-2">
                <select value={destDraft} onChange={e => setDestDraft(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-3 py-2 text-white outline-none text-sm">
                  <option value={SITE_URL}>Homepage</option>
                  {cityOptions.map(c => <option key={c.url} value={c.url}>{c.label}</option>)}
                </select>
                <button onClick={saveDestination} disabled={destSaving}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer">
                  {destSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {destStatus && <p className={`text-xs mt-1.5 ${destStatus.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>{destStatus}</p>}
              <p className="text-white/25 text-xs mt-1.5">Your link/QR code stays the same — this only changes where it sends people.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Clicks", value: data.clicks },
            { label: "Orders", value: data.orders },
            { label: "Tickets Sold", value: data.tickets },
            { label: "Total Sales", value: `$${data.totalSales.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-white/30 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-5 text-center">
            <p className="text-green-400 text-2xl font-bold">${data.totalCommission.toFixed(2)}</p>
            <p className="text-white/40 text-xs mt-1">Total Commission Earned</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-white text-2xl font-bold">${data.totalPaid.toFixed(2)}</p>
            <p className="text-white/40 text-xs mt-1">Paid Out</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-5 text-center">
            <p className="text-yellow-400 text-2xl font-bold">${data.balanceOwed.toFixed(2)}</p>
            <p className="text-white/40 text-xs mt-1">Balance Owed</p>
          </div>
        </div>

        {/* By city */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
          <h3 className="text-white font-bold mb-4">Sales by City</h3>
          {cities.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">No sales yet — share your link to start earning.</p>
          ) : (
            <div className="space-y-2">
              {cities.map(([city, s]) => (
                <div key={city} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{city}</p>
                    <p className="text-white/30 text-xs">{s.orders} order{s.orders !== 1 ? "s" : ""} · {s.tickets} ticket{s.tickets !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">${s.sales.toFixed(2)} sales</p>
                    <p className="text-green-400 text-sm font-semibold">${s.commission.toFixed(2)} commission</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
