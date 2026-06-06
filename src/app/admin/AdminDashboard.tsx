"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Ticket, CalendarDays, Users, Tag, QrCode,
  MessageSquare, FileText, LogOut, Menu, X, TrendingUp, DollarSign,
  RefreshCw, Download, Send, CheckCircle, Search, Plus,
  Trash2, Edit2, Eye, AlertCircle, BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  event: string;
  ticketType: string;
  quantity: number;
  total: number;
  status: string;
  date: string;
  paymentIntentId: string | null;
  receiptUrl: string | null;
}

interface StatsData {
  totalRevenue: number;
  totalTickets: number;
  totalOrders: number;
  ordersToday: number;
  source?: string;
  byCity: Record<string, { revenue: number; tickets: number; byType?: Record<string, number> }>;
}

// ─── Data hook ────────────────────────────────────────────────────────────────
function useAdminData(adminToken: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = { "x-admin-token": adminToken };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch("/api/admin/orders", { headers }),
        fetch("/api/admin/stats", { headers }),
      ]);

      if (ordersRes.status === 401 || statsRes.status === 401) {
        setError("unauthorized");
        setLoading(false);
        return;
      }

      const [ordersData, statsData] = await Promise.all([
        ordersRes.json(),
        statsRes.json(),
      ]);

      setOrders(ordersData.orders || []);
      setStats(statsData);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (adminToken) fetchAll();
  }, [adminToken, fetchAll]);

  return { orders, stats, loading, error, refetch: fetchAll };
}

// Real event config — capacities, venues, colors (not dynamic data)
const EVENTS_CONFIG = [
  { id: 1, city: "Cincinnati", date: "June 13, 2026", venue: "Fountain Square", capacity: 500, status: "on_sale", color: "#F5A623" },
  { id: 2, city: "Cleveland", date: "July 25, 2026", venue: "Cuyahoga County Fairgrounds", capacity: 800, status: "on_sale", color: "#C8102E" },
  { id: 3, city: "Columbus", date: "August 8, 2026", venue: "Gravity / GCCC", capacity: 600, status: "on_sale", color: "#00A878" },
  { id: 4, city: "Phoenix", date: "November 14, 2026", venue: "Phoenix Convention Center", capacity: 1000, status: "on_sale", color: "#7B2FBE" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="font-display text-white text-3xl">{value}</p>
      <p className="text-white/50 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-green-500/15 text-green-400 border-green-500/30",
    refunded: "bg-red-500/15 text-red-400 border-red-500/30",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    read: "bg-white/10 text-white/50 border-white/20",
    replied: "bg-green-500/15 text-green-400 border-green-500/30",
    on_sale: "bg-green-500/15 text-green-400 border-green-500/30",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${styles[status] || "bg-white/10 text-white/50 border-white/20"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function OverviewSection({ stats, orders, loading }: { stats: StatsData | null; orders: Order[]; loading: boolean }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-white text-3xl mb-6">OVERVIEW</h2>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<DollarSign size={18} />} label="Total Revenue" value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} sub="All time" color="#F5A623" />
          <StatCard icon={<Ticket size={18} />} label="Tickets Sold" value={(stats?.totalTickets || 0).toString()} sub="Across all cities" color="#00A878" />
          <StatCard icon={<TrendingUp size={18} />} label="Orders Today" value={(stats?.ordersToday || 0).toString()} color="#7B2FBE" />
          <StatCard icon={<CheckCircle size={18} />} label="Total Orders" value={(stats?.totalOrders || 0).toString()} sub="All time" color="#C8102E" />
        </div>
        )}
      </div>

      {/* Event capacity bars */}
      <div>
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4">Ticket Sales by City</h3>
        <div className="space-y-3">
          {EVENTS_CONFIG.map(ev => {
            const cityStats = stats?.byCity?.[ev.city];
            const sold = cityStats?.tickets ?? 0;
            return (
            <div key={ev.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-lg" style={{ color: ev.color }}>{ev.city}</span>
                <div className="text-right">
                  <span className="text-white/50 text-sm">{sold} / {ev.capacity} sold</span>
                  {cityStats?.revenue ? <span className="text-white/30 text-xs ml-2">${cityStats.revenue.toLocaleString()}</span> : null}
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((sold / ev.capacity) * 100, 100)}%`, background: ev.color }} />
              </div>
              {/* Ticket type breakdown */}
              {cityStats?.byType && Object.keys(cityStats.byType).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(cityStats.byType).map(([type, count]) => (
                    <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                      {type}: <span className="text-white/80 font-semibold">{count}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-white/30 text-xs mt-1">{Math.round((sold / ev.capacity) * 100)}% capacity · {ev.date}</p>
            </div>
          );})}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4">Recent Orders</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white text-sm font-semibold">{order.customer}</p>
                <p className="text-white/40 text-xs">{order.event} · {order.ticketType}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-white font-bold text-sm">${order.total}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && !loading && (
            <p className="text-white/30 text-sm text-center py-4">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersSection({ orders, loading, adminToken, onRefetch }: { orders: Order[]; loading: boolean; adminToken: string; onRefetch: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [refunding, setRefunding] = useState<string | null>(null);

  const filtered = orders.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  const handleRefund = async (order: Order) => {
    if (!order.paymentIntentId) return alert("No payment intent found for this order.");
    if (!confirm(`Refund $${order.total} to ${order.customer}?`)) return;
    setRefunding(order.id);
    try {
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ paymentIntentId: order.paymentIntentId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Refund issued successfully.");
        onRefetch();
      } else {
        alert(`Refund failed: ${data.error}`);
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">ORDERS</h2>
        <button className="flex items-center gap-2 bg-white/5 border border-white/15 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl transition-all cursor-pointer">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, order ID..."
            className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-yellow-500/40" />
        </div>
        {["all", "confirmed", "refunded", "pending"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${filter === f ? "bg-yellow-500 text-black" : "bg-white/5 border border-white/15 text-white/50 hover:text-white"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : (
      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={order.status} />
                  <span className="text-white/25 text-xs font-mono">{order.orderNumber}</span>
                  <span className="text-white/25 text-xs">{order.date}</span>
                </div>
                <p className="text-white font-semibold">{order.customer}</p>
                <p className="text-white/40 text-xs">{order.email} · {order.event} · {order.quantity}× {order.ticketType}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-display text-yellow-400 text-xl">${order.total}</span>
                {order.receiptUrl && (
                  <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="View in Stripe">
                    <Eye size={13} />
                  </a>
                )}
                <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="Resend ticket email">
                  <Send size={13} />
                </button>
                {order.status === "paid" || order.status === "confirmed" ? (
                  <button
                    onClick={() => handleRefund(order)}
                    disabled={refunding === order.id}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-50" title="Issue refund">
                    <RefreshCw size={13} className={refunding === order.id ? "animate-spin" : ""} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-white/30 py-10">No orders found</p>
        )}
      </div>
      )}
    </div>
  );
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold_count: number;
  sort_order: number;
  is_active: boolean;
  is_ga: boolean;
}

interface EventRow {
  id: string;
  slug: string;
  city: string;
  state: string;
  title: string;
  date: string;
  date_iso: string;
  time: string;
  venue: string;
  venue_detail: string;
  venue_address: string;
  description: string;
  color: string;
  tag: string;
  emoji: string;
  free_parking: boolean;
  capacity: number;
  status: string;
  ticket_types: TicketType[];
}

const TICKET_TYPE_ORDER = ["Early Bird", "Regular Rate", "Late Registration", "VIP Experience", "GA"];

function EventEditor({ event, adminToken, onSaved }: { event: EventRow; adminToken: string; onSaved: () => void }) {
  const [ev, setEv] = useState(event);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [newTypeCapacity, setNewTypeCapacity] = useState("");
  const [addingType, setAddingType] = useState(false);

  const field = (k: keyof EventRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEv(prev => ({ ...prev, [k]: e.target.value }));

  const saveEvent = async () => {
    setSaving(true);
    const { ticket_types: _, ...payload } = ev;
    const res = await fetch(`/api/admin/events/${ev.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved(); }
  };

  const updateTicketType = async (ttId: string, updates: Partial<TicketType>) => {
    setEv(prev => ({ ...prev, ticket_types: prev.ticket_types.map(t => t.id === ttId ? { ...t, ...updates } : t) }));
    await fetch(`/api/admin/ticket-types/${ttId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify(updates),
    });
  };

  const deleteTicketType = async (ttId: string) => {
    if (!confirm("Delete this ticket type?")) return;
    setEv(prev => ({ ...prev, ticket_types: prev.ticket_types.filter(t => t.id !== ttId) }));
    await fetch(`/api/admin/ticket-types/${ttId}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
  };

  const addTicketType = async () => {
    if (!newTypeName || !newTypePrice) return;
    setAddingType(true);
    const res = await fetch("/api/admin/ticket-types", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({
        event_id: ev.id, name: newTypeName,
        price: parseFloat(newTypePrice),
        capacity: parseInt(newTypeCapacity) || 300,
        sort_order: ev.ticket_types.length + 1,
      }),
    });
    const data = await res.json();
    if (data.ticketType) {
      setEv(prev => ({ ...prev, ticket_types: [...prev.ticket_types, data.ticketType] }));
      setNewTypeName(""); setNewTypePrice(""); setNewTypeCapacity("");
    }
    setAddingType(false);
  };

  const sortedTypes = [...ev.ticket_types].sort((a, b) => {
    const ai = TICKET_TYPE_ORDER.indexOf(a.name);
    const bi = TICKET_TYPE_ORDER.indexOf(b.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="space-y-6">
      {/* Event Details */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <span style={{ color: ev.color }}>{ev.emoji}</span> Event Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "City", key: "city" as const },
            { label: "State", key: "state" as const },
            { label: "Date (display)", key: "date" as const },
            { label: "Time", key: "time" as const },
            { label: "Venue", key: "venue" as const },
            { label: "Venue Detail", key: "venue_detail" as const },
            { label: "Address", key: "venue_address" as const },
            { label: "Tag", key: "tag" as const },
          ].map(f => (
            <div key={f.key}>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
              <input value={String(ev[f.key] || "")} onChange={field(f.key)}
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Description</label>
            <textarea value={ev.description || ""} onChange={field("description")} rows={3}
              className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none" />
          </div>
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Status</label>
            <select value={ev.status} onChange={field("status")}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none cursor-pointer appearance-none">
              {["on_sale","sold_out","draft","cancelled"].map(s => <option key={s} value={s} className="bg-[#0d0500]">{s.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Total Capacity</label>
            <input type="number" value={ev.capacity} onChange={e => setEv(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))}
              className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="text-white text-sm font-medium">Free Parking</label>
            <button onClick={() => setEv(p => ({ ...p, free_parking: !p.free_parking }))}
              className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${ev.free_parking ? "bg-green-500" : "bg-white/20"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ev.free_parking ? "left-5.5 translate-x-0" : "left-0.5"}`} />
            </button>
          </div>
        </div>
        <button onClick={saveEvent} disabled={saving}
          className="mt-4 flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-6 py-2.5 rounded-xl transition-all cursor-pointer">
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Event Details"}
        </button>
      </div>

      {/* Ticket Types */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-4">Ticket Types</h3>
        <div className="space-y-3 mb-5">
          {sortedTypes.map(tt => (
            <div key={tt.id} className={`border rounded-xl p-4 transition-all ${tt.is_active ? "border-white/15 bg-white/[0.02]" : "border-white/5 opacity-50"}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Name</label>
                  <input value={tt.name}
                    onChange={e => updateTicketType(tt.id, { name: e.target.value })}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Price ($)</label>
                  <input type="number" step="0.01" value={tt.price}
                    onChange={e => updateTicketType(tt.id, { price: parseFloat(e.target.value) })}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Capacity</label>
                  <input type="number" value={tt.capacity}
                    onChange={e => updateTicketType(tt.id, { capacity: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="text-white/30 text-xs mb-1">Sold</p>
                    <p className="text-white font-bold">{tt.sold_count}</p>
                  </div>
                  <div className="flex flex-col gap-1 ml-auto">
                    <button onClick={() => updateTicketType(tt.id, { is_active: !tt.is_active })}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all ${tt.is_active ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-white/10 border-white/20 text-white/40"}`}>
                      {tt.is_active ? "Active" : "Off"}
                    </button>
                    <button onClick={() => deleteTicketType(tt.id)}
                      className="p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 cursor-pointer transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((tt.sold_count / tt.capacity) * 100, 100)}%`, background: tt.sold_count >= tt.capacity ? "#ef4444" : ev.color }} />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-white/20 text-xs">{tt.sold_count} / {tt.capacity} sold</p>
                  {tt.sold_count >= tt.capacity && <span className="text-red-400 text-xs font-bold">SOLD OUT</span>}
                  {tt.sold_count >= tt.capacity * 0.9 && tt.sold_count < tt.capacity && <span className="text-orange-400 text-xs font-semibold">Almost Full</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add ticket type */}
        <div className="border border-dashed border-white/15 rounded-xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Add Ticket Type</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Name (e.g. Early Bird)"
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder-white/20" />
            <input type="number" value={newTypePrice} onChange={e => setNewTypePrice(e.target.value)} placeholder="Price ($)"
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder-white/20" />
            <input type="number" value={newTypeCapacity} onChange={e => setNewTypeCapacity(e.target.value)} placeholder="Capacity"
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder-white/20" />
          </div>
          <button onClick={addTicketType} disabled={addingType || !newTypeName || !newTypePrice}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer">
            <Plus size={13} /> {addingType ? "Adding..." : "Add Ticket Type"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventsSection({ adminToken, stats, editingId, setEditingId }: { adminToken: string; stats: StatsData | null; editingId: string | null; setEditingId: (id: string | null) => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const res = await fetch("/api/admin/events", { headers: { "x-admin-token": adminToken } });
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}</div>;

  const editing = editingId ? events.find(e => e.id === editingId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">EVENTS</h2>
        {editing && (
          <button onClick={() => setEditingId(null)}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm border border-white/15 px-4 py-2 rounded-xl transition-all cursor-pointer">
            ← Back to Events
          </button>
        )}
      </div>

      {editing ? (
        <EventEditor event={editing} adminToken={adminToken} onSaved={fetchEvents} />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {events.map(ev => {
              const totalCapacity = ev.ticket_types.reduce((s, t) => s + t.capacity, 0) || ev.capacity;
              const sold = ev.ticket_types.reduce((s, t) => s + t.sold_count, 0);
              const pct = totalCapacity > 0 ? Math.min((sold / totalCapacity) * 100, 100) : 0;
              return (
                <div key={ev.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <StatusBadge status={ev.status} />
                      <h3 className="font-display text-2xl mt-1" style={{ color: ev.color }}>{ev.city.toUpperCase()}</h3>
                      <p className="text-white/50 text-sm">{ev.date} · {ev.time}</p>
                      <p className="text-white/40 text-xs">{ev.venue}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-white text-3xl">{sold}</p>
                      <p className="text-white/30 text-xs">of {totalCapacity} sold</p>
                      {pct >= 100 && <p className="text-red-400 text-xs font-bold mt-0.5">SOLD OUT</p>}
                      {pct >= 90 && pct < 100 && <p className="text-orange-400 text-xs font-semibold mt-0.5">Almost Full</p>}
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 90 ? "#ef4444" : ev.color }} />
                  </div>
                  {/* Ticket type summary with sold out indicators */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {[...ev.ticket_types].sort((a, b) => a.sort_order - b.sort_order).map(tt => {
                      const isFull = tt.sold_count >= tt.capacity;
                      return (
                      <span key={tt.id} className={`text-xs px-2 py-0.5 rounded-full border ${isFull ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/50"}`}>
                        {tt.name}: <span className={`font-semibold ${isFull ? "text-red-300" : "text-white/80"}`}>{tt.sold_count}</span>
                        <span className="text-white/20">/{tt.capacity}</span>
                        {isFull && <span className="ml-1 font-bold">SOLD OUT</span>}
                      </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(ev.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                      <Edit2 size={12} /> Edit Event
                    </button>
                    <Link href={`/events/${ev.slug}`} target="_blank"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                      <Eye size={12} /> View Page
                    </Link>
                    <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                      <Download size={12} /> Export
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold text-sm">Cincinnati is in 1 week</p>
                <p className="text-white/50 text-sm mt-1">Make sure check-in portals are set up and staff have been invited before June 13.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CustomersSection({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");

  // Derive unique customers from real Stripe orders
  const customerMap = new Map<string, { name: string; email: string; orders: number; totalSpent: number; lastOrder: string }>();
  for (const o of orders) {
    if (!o.email || o.email === "—") continue;
    const existing = customerMap.get(o.email);
    if (existing) {
      existing.orders += 1;
      existing.totalSpent += o.total;
      if (o.date > existing.lastOrder) existing.lastOrder = o.date;
    } else {
      customerMap.set(o.email, { name: o.customer, email: o.email, orders: 1, totalSpent: o.total, lastOrder: o.date });
    }
  }
  const customers = Array.from(customerMap.values());
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">CUSTOMERS</h2>
        <p className="text-white/30 text-sm">{customers.length} total</p>
      </div>
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-yellow-500/40" />
      </div>
      {customers.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p>No customers yet — they&apos;ll appear here once tickets are purchased.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.email} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-all">
              <div>
                <p className="text-white font-semibold text-sm">{c.name}</p>
                <p className="text-white/40 text-xs">{c.email} · last order {c.lastOrder}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white text-sm font-bold">${c.totalSpent.toFixed(2)}</p>
                  <p className="text-white/30 text-xs">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="Send password reset">
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-white/30 py-8">No customers match your search</p>}
        </div>
      )}
    </div>
  );
}

function CouponsSection() {
  const [showCreate, setShowCreate] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "percentage", value: "", maxUses: "", expires: "" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">COUPONS</h2>
        <button onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
          <Plus size={14} /> New Coupon
        </button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-5 mb-6">
          <h3 className="text-white font-bold mb-4">Create Coupon</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Code</label>
              <input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="PROMO10" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white font-mono text-sm outline-none focus:border-yellow-500/40" />
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Type</label>
              <select value={newCoupon.type}
                onChange={e => { const v = e.target.value; setNewCoupon(p => ({ ...p, type: v })); }}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40 cursor-pointer">
                <option value="percentage" className="bg-[#0d0500]">Percentage %</option>
                <option value="fixed" className="bg-[#0d0500]">Fixed $</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Value</label>
              <input type="number" value={newCoupon.value} onChange={e => setNewCoupon(p => ({ ...p, value: e.target.value }))}
                placeholder={newCoupon.type === "percentage" ? "10" : "5"}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40" />
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Max Uses</label>
              <input type="number" value={newCoupon.maxUses} onChange={e => setNewCoupon(p => ({ ...p, maxUses: e.target.value }))}
                placeholder="100" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40" />
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Expires</label>
              <input type="date" value={newCoupon.expires} onChange={e => setNewCoupon(p => ({ ...p, expires: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-5 py-2 rounded-xl transition-all cursor-pointer">Create</button>
            <button onClick={() => setShowCreate(false)} className="bg-white/5 border border-white/15 text-white/60 text-sm px-5 py-2 rounded-xl transition-all cursor-pointer">Cancel</button>
          </div>
        </motion.div>
      )}

      <div className="text-center py-12 text-white/25 border border-dashed border-white/10 rounded-2xl">
        <Tag size={32} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-white/40 mb-1">No coupons yet</p>
        <p className="text-sm">Create your first coupon code above.</p>
      </div>
    </div>
  );
}

function CheckInSection() {
  const [activeEvent, setActiveEvent] = useState(EVENTS_CONFIG[0]);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScan = () => {
    if (!scanInput) return;
    // Mock scan result
    const isValid = scanInput.startsWith("TKT-");
    setScanResult({
      success: isValid,
      message: isValid
        ? `✓ Checked in: ${scanInput} — Sarah Mitchell · All Inclusive`
        : `✗ Invalid ticket: ${scanInput}`,
    });
    if (isValid) setScanInput("");
  };

  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">CHECK-IN PORTAL</h2>

      {/* Event selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {EVENTS_CONFIG.map(ev => (
          <button key={ev.id} onClick={() => setActiveEvent(ev)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeEvent.id === ev.id ? "text-black" : "bg-white/5 border border-white/15 text-white/50 hover:text-white"}`}
            style={activeEvent.id === ev.id ? { background: ev.color } : {}}>
            {ev.city}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual scan */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">Manual Check-In</h3>
          <p className="text-white/40 text-sm mb-4">Enter ticket ID or scan QR code</p>
          <div className="flex gap-2">
            <input
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              placeholder="TKT-CIN-001A"
              className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-yellow-500/40"
            />
            <button onClick={handleScan}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl transition-all cursor-pointer">
              Check In
            </button>
          </div>
          {scanResult && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-3 px-4 py-3 rounded-xl text-sm font-semibold ${scanResult.success ? "bg-green-500/15 border border-green-500/30 text-green-400" : "bg-red-500/15 border border-red-500/30 text-red-400"}`}>
              {scanResult.message}
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">{activeEvent.city} — Live Stats</h3>
          <div className="space-y-3">
            {[
              { label: "Tickets Sold", value: 0, color: "#F5A623" },
              { label: "Checked In", value: 0, color: "#00A878" },
              { label: "Remaining", value: 0, color: "#C8102E" },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-white/50 text-sm">{stat.label}</span>
                <span className="font-display text-2xl" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <button className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white/60 hover:text-white text-sm py-2.5 rounded-xl transition-all cursor-pointer">
              <Users size={14} /> View Full Attendee List
            </button>
          </div>
        </div>
      </div>

      {/* Staff invite */}
      <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-2">Invite Door Staff</h3>
        <p className="text-white/40 text-sm mb-4">Send a check-in link to staff members for {activeEvent.city}.</p>
        <div className="flex gap-2">
          <input placeholder="staff@email.com"
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40 placeholder-white/30" />
          <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
            <Send size={13} /> Invite
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  const [selected, setSelected] = useState<{ id: number; name: string; email: string; subject: string; message: string; status: string; date: string } | null>(null);
  const [reply, setReply] = useState("");

  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">SUPPORT INBOX</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="text-center py-10 text-white/25 border border-dashed border-white/10 rounded-2xl">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Contact form submissions will appear here.</p>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          {selected ? (
            <>
              <div className="mb-4 pb-4 border-b border-white/10">
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-white/40 text-xs">{selected.email} · {selected.date}</p>
                <p className="text-yellow-400 text-sm font-semibold mt-2">{selected.subject}</p>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">{selected.message}</p>
              </div>
              <h4 className="text-white/40 text-xs uppercase tracking-wider mb-3">Reply</h4>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
                placeholder="Type your reply..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/40 resize-none placeholder-white/30 mb-3" />
              <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                <Send size={13} /> Send Reply
              </button>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-white/20">
              <p>Select a message to reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlogAdminSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">BLOG</h2>
        <Link href="/blog" target="_blank"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
          <Plus size={14} /> New Post
        </Link>
      </div>
      <div className="space-y-3">
        {[
          { title: "What to Expect at Tequila Fest USA 2026", category: "Guide", published: "Jan 15, 2026", featured: true },
          { title: "Top 10 Tequilas to Try at This Year's Festival", category: "Tequila", published: "Feb 8, 2026", featured: true },
          { title: "Cincinnati 2026: Fountain Square Venue Guide", category: "Event", published: "Mar 1, 2026", featured: false },
          { title: "How to Become a Tequila Fest Affiliate", category: "Affiliate", published: "Mar 20, 2026", featured: false },
          { title: "Is the VIP Ticket Worth It?", category: "Guide", published: "Apr 5, 2026", featured: false },
        ].map((post, i) => (
          <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 hover:border-white/20 transition-all">
            <div>
              <p className="text-white font-semibold text-sm">{post.title}</p>
              <p className="text-white/40 text-xs">{post.category} · {post.published} {post.featured && "· ⭐ Featured"}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer">
                <Edit2 size={12} />
              </button>
              <button className="p-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-all cursor-pointer">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview",   label: "Overview",    icon: <LayoutDashboard size={17} /> },
  { id: "orders",     label: "Orders",      icon: <Ticket size={17} /> },
  { id: "events",     label: "Events",      icon: <CalendarDays size={17} /> },
  { id: "customers",  label: "Customers",   icon: <Users size={17} /> },
  { id: "coupons",    label: "Coupons",     icon: <Tag size={17} /> },
  { id: "checkin",    label: "Check-In",    icon: <QrCode size={17} /> },
  { id: "contacts",   label: "Inbox",       icon: <MessageSquare size={17} /> },
  { id: "blog",       label: "Blog",        icon: <FileText size={17} /> },
];

// ─── Admin login gate ─────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Verify against real ADMIN_PASSWORD via API
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin(password);
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 text-center">
          <Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={80} height={80} className="w-16 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="font-display text-white text-3xl mb-1">ADMIN</h1>
          <p className="text-white/30 text-sm mb-6">Tequila Fest USA Dashboard</p>
          {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="Admin password" autoFocus
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-yellow-500/40" />
            <button type="submit" disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold py-3 rounded-xl transition-all cursor-pointer">
              {loading ? "Checking..." : "ENTER"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { orders, stats, loading, error, refetch } = useAdminData(adminToken);

  // If token was invalidated by API, log out
  if (error === "unauthorized" && adminToken) {
    setAdminToken("");
  }

  if (!adminToken) return <AdminLogin onLogin={(token) => setAdminToken(token)} />;

  const SECTION_MAP: Record<string, React.ReactNode> = {
    overview:  <OverviewSection stats={stats} orders={orders} loading={loading} />,
    orders:    <OrdersSection orders={orders} loading={loading} adminToken={adminToken} onRefetch={refetch} />,
    events:    <EventsSection adminToken={adminToken} stats={stats} editingId={editingEventId} setEditingId={setEditingEventId} />,
    customers: <CustomersSection orders={orders} />,
    coupons:   <CouponsSection />,
    checkin:   <CheckInSection />,
    contacts:  <ContactSection />,
    blog:      <BlogAdminSection />,
  };

  return (
    <div className="min-h-screen bg-[#0d0500] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 flex-shrink-0 flex flex-col border-r border-white/10 bg-black/60 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/tequilafest_usa.png" alt="TF" width={32} height={32} className="w-8 h-8" />
            <div>
              <p className="font-display text-yellow-400 text-sm leading-none">TEQUILA FEST</p>
              <p className="text-white/30 text-xs">Admin</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); if (item.id === "events") setEditingEventId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${activeSection === item.id ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          <Link href="/" target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
            <Eye size={15} /> View Site
          </Link>
          <button onClick={() => setAdminToken("")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer">
            <LogOut size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-5 h-14 border-b border-white/10 bg-[#0d0500]/90 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/50 hover:text-white cursor-pointer">
            <Menu size={20} />
          </button>
          <p className="font-display text-white/60 text-lg capitalize lg:hidden">{activeSection}</p>
          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/40 text-xs">Cincinnati · 7 days away</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs hidden sm:block">Admin</span>
          </div>
        </div>

        {/* Section content */}
        <div className="flex-1 p-5 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>
              {SECTION_MAP[activeSection]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
