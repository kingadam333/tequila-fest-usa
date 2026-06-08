"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Ticket, CalendarDays, Users, Tag, QrCode,
  MessageSquare, FileText, LogOut, Menu, X, TrendingUp, DollarSign,
  RefreshCw, Download, Send, CheckCircle, Search, Plus,
  Trash2, Edit2, Eye, AlertCircle, BarChart2, Mail, Utensils, Share2,
  Star, Gift, UserCheck, ChevronRight,
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
  totalServiceFees?: number;
  totalTicketRevenue?: number;
  byCity: Record<string, { revenue: number; tickets: number; byType?: Record<string, number> }>;
}

// ─── Data hook ────────────────────────────────────────────────────────────────
function useAdminData(adminToken: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const headers = { "x-admin-token": adminToken };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, statsRes, eventsRes] = await Promise.all([
        fetch("/api/admin/orders", { headers }),
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/events", { headers }),
      ]);

      if (ordersRes.status === 401 || statsRes.status === 401) {
        setError("unauthorized");
        setLoading(false);
        return;
      }

      const [ordersData, statsData, eventsData] = await Promise.all([
        ordersRes.json(),
        statsRes.json(),
        eventsRes.json(),
      ]);

      setOrders(ordersData.orders || []);
      setStats(statsData);
      setEvents(eventsData.events || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (adminToken) fetchAll();
  }, [adminToken, fetchAll]);

  // Auto-refresh every 60 seconds while logged in
  useEffect(() => {
    if (!adminToken) return;
    const interval = setInterval(() => fetchAll(), 60_000);
    return () => clearInterval(interval);
  }, [adminToken, fetchAll]);

  return { orders, stats, events, loading, error, refetch: fetchAll };
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
    on_sale:        "bg-green-500/15 text-green-400 border-green-500/30",
    coming_soon:    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    sold_out:       "bg-red-500/15 text-red-400 border-red-500/30",
    cancelled:      "bg-red-900/20 text-red-500/70 border-red-900/30",
    draft:          "bg-white/5 text-white/30 border-white/10",
    "auto-replied": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "needs-review": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${styles[status as keyof typeof styles] || "bg-white/10 text-white/50 border-white/20"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function OverviewSection({ stats, orders, events, loading }: { stats: StatsData | null; orders: Order[]; events: EventRow[]; loading: boolean }) {
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
          <StatCard icon={<DollarSign size={18} />} label="Gross Revenue" value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} sub="Tickets + fees" color="#F5A623" />
          <StatCard icon={<Ticket size={18} />} label="Tickets Sold" value={(stats?.totalTickets || 0).toString()} sub="Across all cities" color="#00A878" />
          <StatCard icon={<TrendingUp size={18} />} label="Orders Today" value={(stats?.ordersToday || 0).toString()} color="#7B2FBE" />
          <StatCard icon={<CheckCircle size={18} />} label="Service Fees" value={`$${(stats?.totalServiceFees || 0).toFixed(2)}`} sub="Platform + processing" color="#C8102E" />
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
            const dbEvent = events.find(e => e.city.toLowerCase() === ev.city.toLowerCase());
            const capacity = dbEvent && dbEvent.ticket_types.length > 0
              ? dbEvent.ticket_types.reduce((s, t) => s + t.capacity, 0)
              : ev.capacity;
            return (
            <div key={ev.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-lg" style={{ color: ev.color }}>{ev.city}</span>
                <div className="text-right">
                  <span className="text-white/50 text-sm">{sold} / {capacity} sold</span>
                  {cityStats?.revenue ? <span className="text-white/30 text-xs ml-2">${cityStats.revenue.toLocaleString()}</span> : null}
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((sold / capacity) * 100, 100)}%`, background: ev.color }} />
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
              <p className="text-white/30 text-xs mt-1">{Math.round((sold / capacity) * 100)}% capacity · {ev.date}</p>
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
  const [resending, setResending] = useState<string | null>(null);

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

  const handleResendTicket = async (order: Order) => {
    if (!confirm(`Resend ticket email to ${order.email}?`)) return;
    setResending(order.id);
    try {
      const res = await fetch("/api/admin/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ order_number: order.orderNumber }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Ticket email sent to ${order.email}`);
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setResending(null);
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
                <button
                  onClick={() => handleResendTicket(order)}
                  disabled={resending === order.id}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  title="Resend ticket email">
                  <Send size={13} className={resending === order.id ? "animate-pulse" : ""} />
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
  platform_fee: number;
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>((event as any).og_image || null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setImageUploading(true);
    try {
      // Resize + compress client-side via Canvas before uploading
      const resizedBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          // Target: max 1600px wide, maintain aspect ratio
          const MAX_W = 1600;
          const scale = img.width > MAX_W ? MAX_W / img.width : 1;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
            "image/webp",
            0.88 // quality
          );
        };
        img.onerror = reject;
        img.src = url;
      });

      // Show local preview immediately
      setImagePreview(URL.createObjectURL(resizedBlob));

      // Upload as multipart form data
      const form = new FormData();
      form.append("eventId", ev.id);
      form.append("file", resizedBlob, `${ev.id}.webp`);

      const res = await fetch("/api/admin/events/upload-image", {
        method: "POST",
        headers: { "x-admin-token": adminToken },
        body: form,
      });
      const data = await res.json();
      if (data.url) {
        setImagePreview(data.url);
        setEv(p => ({ ...p, og_image: data.url } as any));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err: any) {
      alert("Upload error: " + err.message);
    } finally {
      setImageUploading(false);
    }
  };

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
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Save failed: ${err.error || res.statusText}`);
    }
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
              {["on_sale","coming_soon","sold_out","draft","cancelled"].map(s => <option key={s} value={s} className="bg-[#0d0500]">{s.replace(/_/g," ")}</option>)}
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

      {/* OG / Header Image */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-1 flex items-center gap-2">
          <span className="text-yellow-400">🖼</span> City Header Image
        </h3>
        <p className="text-white/30 text-xs mb-4">Used as the hero background on the city event page. Recommended: 1600×900px or wider, JPG/PNG/WebP.</p>

        {/* Preview */}
        {imagePreview && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "16/6" }}>
            <img src={imagePreview} alt="OG header" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-2 right-3 text-white/40 text-xs">Current image</span>
          </div>
        )}

        {/* Upload area */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={imageUploading}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-yellow-500/40 disabled:opacity-50 text-white/70 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
        >
          {imageUploading ? (
            <><RefreshCw size={14} className="animate-spin" /> Uploading...</>
          ) : (
            <><Download size={14} className="rotate-180" /> {imagePreview ? "Replace Image" : "Upload Image"}</>
          )}
        </button>
      </div>

      {/* Ticket Types */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-bold mb-4">Ticket Types</h3>
        <div className="space-y-3 mb-5">
          {sortedTypes.map(tt => (
            <div key={tt.id} className={`border rounded-xl p-4 transition-all ${tt.is_active ? "border-white/15 bg-white/[0.02]" : "border-white/5 opacity-50"}`}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <div className="sm:col-span-2">
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
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1 flex items-center gap-1">
                    Platform Fee ($)
                    <span className="text-white/20 normal-case font-normal text-[10px]">per ticket</span>
                  </label>
                  <input type="number" step="0.01" min="0" value={tt.platform_fee ?? 3}
                    onChange={e => updateTicketType(tt.id, { platform_fee: parseFloat(e.target.value) })}
                    className="w-full bg-yellow-500/10 border border-yellow-500/20 focus:border-yellow-500/50 rounded-xl px-3 py-2 text-yellow-400 text-sm outline-none" />
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

const EVENTS_LIST = [
  { slug: "cincinnati", city: "Cincinnati" },
  { slug: "cleveland",  city: "Cleveland" },
  { slug: "columbus",   city: "Columbus" },
  { slug: "phoenix",    city: "Phoenix" },
];

const TICKET_TYPES = ["Early Bird", "Regular Rate", "Late Registration", "VIP Experience", "GA"];

interface UserRecord {
  id: string | null;
  email: string;
  hasAccount: boolean;
  first_name: string;
  last_name: string;
  phone: string | null;
  loyalty_points: number;
  created_at: string;
  name: string;
  hasTickets: boolean;
  totalSpent: number;
  ticketCount: number;
  orders: Array<{ order_number: string; ticket_type: string; quantity: number; total: number; event_city: string; created_at: string; status: string }>;
}

// ─── Loyalty Modal ────────────────────────────────────────────────────────────
function LoyaltyModal({ userId, userName, adminToken, onClose }: { userId: string; userName: string; adminToken: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "referrals" | "redemptions">("transactions");

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/loyalty`, { headers: { "x-admin-token": adminToken } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [userId, adminToken]);

  const ACTION_LABELS: Record<string, string> = {
    ticket_purchase: "Ticket Purchase",
    photo_upload: "Photo Upload",
    video_upload: "Video Upload",
    social_share: "Social Share",
    referral: "Referral",
    redemption: "Redemption",
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0d0500] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <p className="text-white font-bold text-lg">{userName}</p>
            <p className="text-white/40 text-sm">Loyalty & Rewards</p>
          </div>
          <div className="flex items-center gap-4">
            {data?.account && (
              <div className="text-right">
                <p className="font-display text-yellow-400 text-2xl leading-none">{(data.account.loyalty_points || 0).toLocaleString()}</p>
                <p className="text-white/30 text-xs">points</p>
              </div>
            )}
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {([
            ["transactions", "Point History", <Star size={13} key="s" />],
            ["referrals", "Referrals", <UserCheck size={13} key="u" />],
            ["redemptions", "Redemptions", <Gift size={13} key="g" />],
          ] as const).map(([id, label, icon]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === id ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white"}`}>
              {icon}{label}
              {id === "referrals" && data?.referrals?.length > 0 && (
                <span className="bg-black/20 rounded-full px-1.5 py-0.5 text-xs">{data.referrals.length}</span>
              )}
              {id === "redemptions" && data?.redemptions?.length > 0 && (
                <span className="bg-black/20 rounded-full px-1.5 py-0.5 text-xs">{data.redemptions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-white/30 text-sm text-center py-8">Loading...</p>
          ) : (
            <>
              {/* Point History */}
              {activeTab === "transactions" && (
                <div className="space-y-2">
                  {data.transactions.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-8">No transactions yet</p>
                  ) : data.transactions.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white/80 text-sm font-medium">{ACTION_LABELS[t.action_code] || t.action_code}</p>
                        <p className="text-white/30 text-xs mt-0.5">{t.description}</p>
                        <p className="text-white/20 text-xs">{new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <span className={`font-display text-lg font-bold ${t.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {t.points >= 0 ? "+" : ""}{t.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Referrals */}
              {activeTab === "referrals" && (
                <div className="space-y-3">
                  {data.referralCodes.length > 0 && (
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 mb-4">
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Referral Codes</p>
                      {data.referralCodes.map((c: any) => (
                        <p key={c.code} className="font-mono text-yellow-400 text-sm">{c.code} <span className="text-white/30">— {c.event_slug}</span></p>
                      ))}
                    </div>
                  )}
                  {data.referrals.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-8">No referrals yet</p>
                  ) : data.referrals.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white/80 text-sm font-medium">{r.referred_email || "Unknown"}</p>
                        <p className="text-white/30 text-xs mt-0.5">Order {r.referred_order_id?.slice(0, 8)}…</p>
                        <p className="text-white/20 text-xs">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === "converted" ? "bg-green-500/15 text-green-400" : "bg-white/8 text-white/30"}`}>
                          {r.status}
                        </span>
                        {r.points_awarded > 0 && <p className="text-green-400 text-xs mt-1">+{r.points_awarded} pts</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Redemptions */}
              {activeTab === "redemptions" && (
                <div className="space-y-2">
                  {data.redemptions.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-8">No redemptions yet</p>
                  ) : data.redemptions.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white/80 text-sm font-medium">{r.reward_name}</p>
                        <p className="text-white/30 text-xs mt-0.5">{r.points_cost} pts · {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        {r.notes && <p className="text-white/20 text-xs mt-0.5">{r.notes}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        r.status === "fulfilled" ? "bg-green-500/15 text-green-400" :
                        r.status === "pending" ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-white/8 text-white/30"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function UsersSection({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<"tickets" | "free">("tickets");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compUserId, setCompUserId] = useState<string | null>(null);
  const [loyaltyUser, setLoyaltyUser] = useState<{ id: string; name: string } | null>(null);

  // Add user form
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", phone: "", sendWelcome: true });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Comp ticket form
  const [compForm, setCompForm] = useState({ eventSlug: "cincinnati", ticketType: "GA" });
  const [comping, setComping] = useState(false);
  const [compSuccess, setCompSuccess] = useState("");

  const headers = { "x-admin-token": adminToken };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users", { headers: headers as any });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filtered = users
    .filter(u => tab === "tickets" ? u.hasTickets : !u.hasTickets)
    .filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  const addUser = async () => {
    setAddError("");
    if (!addForm.email) { setAddError("Email is required"); return; }
    setAdding(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" } as any,
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ firstName: "", lastName: "", email: "", phone: "", sendWelcome: true });
      load();
    } else {
      setAddError(data.error || "Failed to create user");
    }
    setAdding(false);
  };

  const compTicket = async () => {
    if (!compUserId) return;
    setComping(true);
    setCompSuccess("");
    const compUser = users.find(u => (u.id || u.email) === compUserId);
    const eventCity = EVENTS_LIST.find(e => e.slug === compForm.eventSlug)?.city || compForm.eventSlug;
    // Use "none" as id placeholder for ticket-only users; pass email in body
    const urlId = compUser?.id || "none";
    const emailOverride = compUser?.id ? undefined : compUser?.email;
    const res = await fetch(`/api/admin/users/${urlId}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" } as any,
      body: JSON.stringify({ action: "comp_ticket", eventSlug: compForm.eventSlug, eventCity, ticketType: compForm.ticketType, email: emailOverride }),
    });
    const data = await res.json();
    if (res.ok) {
      setCompSuccess(`✓ Comp ticket created — Order ${data.orderNumber}`);
      load();
      setTimeout(() => { setCompUserId(null); setCompSuccess(""); }, 3000);
    }
    setComping(false);
  };

  const ticketCount = users.filter(u => u.hasTickets).length;
  const freeCount = users.filter(u => !u.hasTickets).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-white text-3xl">USERS</h2>
          <p className="text-white/30 text-sm mt-0.5">{users.length} total accounts</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setAddError(""); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Add user form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white">Add User</h3>
              {addError && <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2">{addError}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">First Name</label>
                  <input value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Last Name</label>
                  <input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="user@email.com"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Phone</label>
                  <input type="tel" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div onClick={() => setAddForm(f => ({ ...f, sendWelcome: !f.sendWelcome }))}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${addForm.sendWelcome ? "bg-yellow-500 border-yellow-500" : "border-white/30"}`}>
                  {addForm.sendWelcome && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
                <span className="text-white/60 text-sm">Send welcome email with account link</span>
              </label>
              <div className="flex gap-3">
                <button onClick={addUser} disabled={adding}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                  <Plus size={14} /> {adding ? "Creating..." : "Create User"}
                </button>
                <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white/70 text-sm px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/10 rounded-xl p-1 w-fit">
        {([["tickets", `Ticket Buyers (${ticketCount})`], ["free", `No Tickets (${freeCount})`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setExpandedId(null); setSearch(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === id ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white/70"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab} users...`}
          className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-yellow-500/40" />
      </div>

      {/* Loyalty modal */}
      <AnimatePresence>
        {loyaltyUser && (
          <LoyaltyModal
            userId={loyaltyUser.id}
            userName={loyaltyUser.name}
            adminToken={adminToken}
            onClose={() => setLoyaltyUser(null)}
          />
        )}
      </AnimatePresence>

      {/* Comp ticket modal */}
      <AnimatePresence>
        {compUserId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setCompUserId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#1a0e02] border border-white/15 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-white text-lg mb-1">Comp a Ticket</h3>
              <p className="text-white/40 text-sm mb-5">
                {users.find(u => u.id === compUserId)?.name}
              </p>
              {compSuccess ? (
                <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">{compSuccess}</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Event</label>
                    <select value={compForm.eventSlug} onChange={e => setCompForm(f => ({ ...f, eventSlug: e.target.value }))}
                      className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white outline-none text-sm cursor-pointer">
                      {EVENTS_LIST.map(ev => (
                        <option key={ev.slug} value={ev.slug} className="bg-[#0d0500]">{ev.city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Ticket Type</label>
                    <select value={compForm.ticketType} onChange={e => setCompForm(f => ({ ...f, ticketType: e.target.value }))}
                      className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white outline-none text-sm cursor-pointer">
                      {TICKET_TYPES.map(t => <option key={t} value={t} className="bg-[#0d0500]">{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={compTicket} disabled={comping}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm py-2.5 rounded-xl transition-all cursor-pointer">
                      {comping ? "Creating..." : "Comp Ticket"}
                    </button>
                    <button onClick={() => setCompUserId(null)}
                      className="text-white/40 hover:text-white/70 text-sm px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User list */}
      {loading ? (
        <div className="text-center py-16 text-white/30 text-sm">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "No users match your search" : `No ${tab} users yet`}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u, idx) => (
            <div key={u.id || u.email || idx} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden transition-all">
              {/* Row */}
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{u.name}</p>
                  <p className="text-white/35 text-xs mt-0.5 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  {u.hasTickets && (
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">${u.totalSpent.toFixed(0)}</p>
                      <p className="text-white/30 text-xs">{u.ticketCount} ticket{u.ticketCount !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    {u.hasTickets && (
                      <button onClick={() => { const key = u.id || u.email; setExpandedId(expandedId === key ? null : key); }}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="View orders & tickets">
                        <Eye size={13} />
                      </button>
                    )}
                    {u.id && (
                      <button onClick={() => setLoyaltyUser({ id: u.id!, name: u.name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        title={`${u.loyalty_points || 0} pts`}>
                        <Star size={11} /> {u.loyalty_points || 0} pts
                      </button>
                    )}
                    <button onClick={() => { setCompUserId(u.id || u.email); setCompSuccess(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400 text-xs font-semibold rounded-lg transition-all cursor-pointer">
                      <Ticket size={11} /> Comp
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded orders */}
              <AnimatePresence>
                {expandedId === (u.id || u.email) && u.orders.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/[0.06]">
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Orders</p>
                      {u.orders.map((o, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-white/70 text-xs font-mono">{o.order_number}</p>
                            <p className="text-white/40 text-xs">{o.event_city} · {o.ticket_type} × {o.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/70 text-xs font-semibold">{o.total === 0 ? "COMP" : `$${Number(o.total).toFixed(2)}`}</p>
                            <p className="text-white/25 text-xs">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
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

interface ContactSubmission {
  id: string; name: string; email: string; subject: string;
  message: string; status: string; created_at: string; admin_reply?: string;
  inbox?: string;
}

const INBOXES = [
  { id: "Support",    label: "Support",    email: "help@mail.tequilafestusa.com",       color: "#F5A623", icon: "💬" },
  { id: "Vendors",    label: "Vendors",    email: "vendors@mail.tequilafestusa.com",    color: "#7B2FBE", icon: "🛒" },
  { id: "Sponsors",   label: "Sponsors",   email: "sponsors@mail.tequilafestusa.com",   color: "#C0C0C0", icon: "⭐" },
  { id: "Affiliates", label: "Affiliates", email: "affiliates@mail.tequilafestusa.com", color: "#C8102E", icon: "🤝" },
];

function ContactSection({ adminToken }: { adminToken: string }) {
  const [activeInbox, setActiveInbox] = useState("Support");
  const [activeTab, setActiveTab] = useState<"inbox" | "knowledge">("inbox");
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardCc, setForwardCc] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [forwardStatus, setForwardStatus] = useState("");

  const handleForward = async () => {
    if (!selected || !forwardTo.trim()) return;
    setForwarding(true); setForwardStatus("");
    try {
      const res = await fetch("/api/admin/contact/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ id: selected.id, to: forwardTo, note: forwardNote, cc: forwardCc }),
      });
      const data = await res.json();
      if (res.ok) {
        setForwardStatus("Forwarded");
        setTimeout(() => { setForwardOpen(false); setForwardTo(""); setForwardCc(""); setForwardNote(""); setForwardStatus(""); }, 900);
      } else setForwardStatus(`Error: ${data.error || "failed"}`);
    } catch (e: any) { setForwardStatus(`Error: ${e?.message || "failed"}`); }
    setForwarding(false);
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/contact", {
        headers: { "x-admin-token": adminToken },
      });
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.submissions || []);
      }
    };
    if (adminToken) load();
  }, [adminToken]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    setDeleting(true);
    try {
      await fetch("/api/admin/contact", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ id }),
      });
      setSubmissions(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { /* ignore */ }
    setDeleting(false);
  };

  const inbox = INBOXES.find(i => i.id === activeInbox) || INBOXES[0];
  const filtered = submissions.filter(s => (s.inbox || "Support") === activeInbox);
  const unread = (id: string) => submissions.filter(s => (s.inbox || "Support") === id && (s.status === "new" || s.status === "needs-review")).length;

  const handleSendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          submissionId: selected.id,
          replyTo: selected.email,
          replyToName: selected.name,
          fromEmail: inbox.email,
          subject: `Re: ${selected.subject}`,
          message: reply,
          inbox: activeInbox,
        }),
      });
      if (res.ok) {
        setSent(true);
        setSubmissions(prev => prev.map(s => s.id === selected.id ? { ...s, status: "replied", admin_reply: reply } : s));
        setTimeout(() => { setSent(false); setReply(""); }, 2500);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const suggestReply = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ name: selected.name, email: selected.email, subject: selected.subject, message: selected.message }),
      });
      const data = await res.json();
      if (data.reply) setReply(data.reply);
    } catch { /* ignore */ }
    setAiLoading(false);
  };

  const runAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selected.id,
          name: selected.name,
          email: selected.email,
          subject: selected.subject,
          message: selected.message,
        }),
      });
      const data = await res.json();
      if (data.handled) {
        setSubmissions(prev => prev.map(s => s.id === selected.id ? { ...s, status: "auto-replied", ai_handled: true, admin_reply: data.reply } : s));
        setSelected(s => s ? { ...s, status: "auto-replied", ai_handled: true, admin_reply: data.reply } as any : s);
      } else if (data.escalated) {
        setSubmissions(prev => prev.map(s => s.id === selected.id ? { ...s, status: "needs-review" } : s));
        setSelected(s => s ? { ...s, status: "needs-review" } as any : s);
      }
    } catch { /* ignore */ }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">INBOX</h2>
        {/* Section tabs */}
        <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1">
          {(["inbox", "knowledge"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer capitalize ${activeTab === t ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white/70"}`}>
              {t === "knowledge" ? "Knowledge Base" : "Inbox"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "knowledge" && <KnowledgeBaseSection adminToken={adminToken} />}
      {activeTab === "inbox" && <>

      {/* Inbox tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {INBOXES.map(ib => {
          const count = unread(ib.id);
          const total = submissions.filter(s => (s.inbox || "Support") === ib.id).length;
          return (
            <button key={ib.id} onClick={() => { setActiveInbox(ib.id); setSelected(null); setReply(""); }}
              className={`rounded-xl px-3 py-2.5 border text-left transition-all cursor-pointer ${activeInbox === ib.id ? "border-opacity-50" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
              style={activeInbox === ib.id ? { borderColor: `${ib.color}60`, background: `${ib.color}10` } : {}}>
              <div className="flex items-center gap-2">
                <span className="text-base">{ib.icon}</span>
                <p className="font-bold text-sm truncate" style={{ color: activeInbox === ib.id ? ib.color : "rgba(255,248,240,0.7)" }}>{ib.label}</p>
                {count > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{count}</span>
                )}
              </div>
              <p className="text-white/20 text-[10px] mt-1">{total} message{total !== 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Messages + reply */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2 overflow-y-auto max-h-[500px]">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-white/25 border border-dashed border-white/10 rounded-2xl">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No {activeInbox.toLowerCase()} messages yet.</p>
            </div>
          ) : filtered.map(s => (
            <button key={s.id} onClick={() => { setSelected(s); setReply(""); setSent(false); }}
              className={`w-full text-left bg-white/[0.03] border rounded-2xl px-4 py-3.5 transition-all cursor-pointer ${selected?.id === s.id ? "border-yellow-500/40 bg-yellow-500/5" : s.status === "needs-review" ? "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50" : "border-white/10 hover:border-white/20"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-semibold text-sm">{s.name}</p>
                <div className="flex items-center gap-1.5">
                  {(s as any).ai_handled === true && s.status === "auto-replied" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">✨ AI</span>
                  )}
                  <StatusBadge status={s.status} />
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                    disabled={deleting}
                    className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 transition-all cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <p className="text-white/50 text-xs">{s.subject}</p>
              <p className="text-white/30 text-xs mt-0.5 truncate">{s.message}</p>
              <p className="text-white/20 text-xs mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          {selected ? (
            <>
              <div className="mb-4 pb-4 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <p className="text-white font-bold">{selected.name}</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setForwardOpen(o => !o); setForwardStatus(""); }}
                      className="flex items-center gap-1 text-xs text-white/50 hover:text-yellow-400 transition-all cursor-pointer">
                      <Send size={12} /> Forward
                    </button>
                    <button onClick={() => handleDelete(selected.id)} disabled={deleting}
                      className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-all cursor-pointer">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
                {forwardOpen && (
                  <div className="mt-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
                    <input value={forwardTo} onChange={e => setForwardTo(e.target.value)} placeholder="forward to (email, comma-separated)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
                    <div className="flex items-center gap-2">
                      <input value={forwardCc} onChange={e => setForwardCc(e.target.value)} placeholder="cc (optional, comma-separated)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
                      <button type="button" onClick={() => setForwardCc(cc => {
                        const tre = "tre.santamaria@condadotacos.com";
                        const list = cc.split(",").map(s => s.trim()).filter(Boolean);
                        return list.includes(tre) ? cc : [...list, tre].join(", ");
                      })} className="text-xs text-yellow-400 hover:text-yellow-300 cursor-pointer whitespace-nowrap">+ Tre</button>
                    </div>
                    <textarea value={forwardNote} onChange={e => setForwardNote(e.target.value)} rows={2} placeholder="optional note above the forwarded message"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40 resize-y" />
                    <div className="flex items-center gap-2">
                      <button onClick={handleForward} disabled={forwarding || !forwardTo.trim()}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-40">
                        {forwarding ? "Sending…" : "Send Forward"}
                      </button>
                      <button onClick={() => { setForwardOpen(false); setForwardTo(""); setForwardNote(""); }}
                        className="text-xs text-white/40 hover:text-white cursor-pointer">Cancel</button>
                      {forwardStatus && <span className="text-xs text-white/60 ml-auto">{forwardStatus}</span>}
                    </div>
                  </div>
                )}
                <p className="text-white/40 text-xs">{selected.email} · {new Date(selected.created_at).toLocaleDateString()}</p>
                <p className="text-sm font-semibold mt-2" style={{ color: inbox.color }}>{selected.subject}</p>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">{selected.message}</p>
                {selected.admin_reply && (
                  <div className={`mt-3 p-3 rounded-xl border ${(selected as any).ai_handled ? "bg-blue-900/20 border-blue-500/20" : "bg-green-900/20 border-green-500/20"}`}>
                    <p className={`text-xs font-semibold mb-1 ${(selected as any).ai_handled ? "text-blue-400" : "text-green-400"}`}>
                      {(selected as any).ai_handled ? "✨ Auto-replied by AI:" : "Previous reply sent:"}
                    </p>
                    <p className="text-white/50 text-xs">{selected.admin_reply}</p>
                  </div>
                )}
                {selected.status === "needs-review" && (
                  <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-xl">
                    <p className="text-orange-400 text-xs font-semibold">⚠️ AI could not answer — needs your reply</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-white/30 text-xs">Replying from:</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color: inbox.color, borderColor: `${inbox.color}40` }}>
                  {inbox.email}
                </span>
              </div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5}
                placeholder={`Type your reply to ${selected.name}...`}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/40 resize-none placeholder-white/30 mb-3" />
              <div className="flex items-center gap-2">
                <button onClick={handleSendReply} disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                  {sending ? "Sending..." : sent ? "✓ Sent!" : <><Send size={13} /> Send Reply</>}
                </button>
                <button onClick={suggestReply} disabled={aiLoading}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-yellow-500/40 text-white/60 hover:text-yellow-400 text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                  {aiLoading ? (
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  ) : <span>✨</span>}
                  {aiLoading ? "Thinking..." : "AI Suggest"}
                </button>
                {(selected.status === "new" || selected.status === "needs-review") && (
                  <button onClick={runAI} disabled={aiLoading}
                    className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                    {aiLoading ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    ) : <span>🤖</span>}
                    {aiLoading ? "Processing..." : "Auto-Handle with AI"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-white/20 py-10">
              <p>Select a message to reply</p>
            </div>
          )}
        </div>
      </div>
      </>}
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

// ─── Brands Section ───────────────────────────────────────────────────────────

interface BrandEntry { name: string; price_per_bottle: string; }
interface BrandContact {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  contact_type: "distributor" | "supplier" | "self_distributed";
  brands: BrandEntry[];
  distributor?: string;
  supplier?: string;
  notes?: string;
  created_at: string;
}
interface BrandInvoice {
  id: string;
  invoice_number: string;
  brand_contact_id: string;
  event_name?: string;
  line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  total: number;
  status: string;
  stripe_payment_link_url?: string;
  due_date?: string;
  created_at: string;
  brand_contacts?: { contact_name: string; contact_email: string };
}

const CONTACT_TYPES = [
  { value: "distributor", label: "Distributor" },
  { value: "supplier", label: "Supplier" },
  { value: "self_distributed", label: "Self Distributed" },
];

const BLANK_BRAND: BrandEntry = { name: "", price_per_bottle: "" };
const BLANK_CONTACT = { contact_name: "", contact_email: "", contact_phone: "", contact_type: "self_distributed" as const, brands: [{ ...BLANK_BRAND }], distributor: "", supplier: "", notes: "" };
const BLANK_LINE_ITEM = { description: "", quantity: 1, unit_price: 0, total: 0 };

interface BrandOrder {
  id: string;
  order_number: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  tier: string;
  cities: string[];
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
}

const CITY_LABELS_BRAND: Record<string, string> = {
  cleveland: "Cleveland, OH",
  cincinnati: "Cincinnati, OH",
  columbus: "Columbus, OH",
  phoenix: "Phoenix, AZ",
};

function BrandsSection({ adminToken }: { adminToken: string }) {
  const headers = { "x-admin-token": adminToken };
  const [view, setView] = useState<"inbox" | "orders" | "contacts" | "invoices">("inbox");
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await fetch("/api/admin/brand-orders", { headers });
    if (res.ok) setOrders((await res.json()).orders || []);
    setLoadingOrders(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Contacts state
  const [contacts, setContacts] = useState<BrandContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [editContact, setEditContact] = useState<BrandContact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ ...BLANK_CONTACT });
  const [savingContact, setSavingContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // ── Invoice state
  const [invoices, setInvoices] = useState<BrandInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ brand_contact_id: "", event_name: "", due_date: "", notes: "", line_items: [{ ...BLANK_LINE_ITEM }] });
  const [savingInvoice, setSavingInvoice] = useState(false);

  // ── Inbox state (brands inbox)
  const [brandMessages, setBrandMessages] = useState<ContactSubmission[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<ContactSubmission | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [bForwardOpen, setBForwardOpen] = useState(false);
  const [bForwardTo, setBForwardTo] = useState("");
  const [bForwardCc, setBForwardCc] = useState("");
  const [bForwardNote, setBForwardNote] = useState("");
  const [bForwarding, setBForwarding] = useState(false);
  const [bForwardStatus, setBForwardStatus] = useState("");

  const deleteBrandMsg = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await fetch("/api/admin/contact", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBrandMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMsg?.id === id) setSelectedMsg(null);
  };

  const forwardBrandMsg = async () => {
    if (!selectedMsg || !bForwardTo.trim()) return;
    setBForwarding(true); setBForwardStatus("");
    try {
      const res = await fetch("/api/admin/contact/forward", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMsg.id, to: bForwardTo, note: bForwardNote, cc: bForwardCc }),
      });
      const data = await res.json();
      if (res.ok) {
        setBForwardStatus("Forwarded");
        setTimeout(() => { setBForwardOpen(false); setBForwardTo(""); setBForwardCc(""); setBForwardNote(""); setBForwardStatus(""); }, 900);
      } else setBForwardStatus(`Error: ${data.error || "failed"}`);
    } catch (e: any) { setBForwardStatus(`Error: ${e?.message || "failed"}`); }
    setBForwarding(false);
  };

  // ── Compose (broadcast) state
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSelected, setComposeSelected] = useState<Set<string>>(new Set());
  const [composeSending, setComposeSending] = useState(false);
  const [composeStatus, setComposeStatus] = useState<string>("");
  const [composeSearch, setComposeSearch] = useState("");

  const composeRecipients = contacts.filter(c => c.contact_email);
  const composeFiltered = composeRecipients.filter(c =>
    !composeSearch ||
    c.contact_name.toLowerCase().includes(composeSearch.toLowerCase()) ||
    c.contact_email.toLowerCase().includes(composeSearch.toLowerCase()) ||
    c.brands.some(b => b.name.toLowerCase().includes(composeSearch.toLowerCase()))
  );
  const allSelected = composeRecipients.length > 0 && composeSelected.size === composeRecipients.length;
  const toggleAllRecipients = () => {
    if (allSelected) setComposeSelected(new Set());
    else setComposeSelected(new Set(composeRecipients.map(c => c.id)));
  };
  const toggleRecipient = (id: string) => {
    setComposeSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const openCompose = () => {
    setComposeSubject(""); setComposeMessage(""); setComposeCc(""); setComposeSelected(new Set()); setComposeStatus(""); setComposeSearch("");
    setShowCompose(true);
  };
  const sendBroadcast = async () => {
    const emails = composeRecipients.filter(c => composeSelected.has(c.id)).map(c => c.contact_email);
    if (!emails.length || !composeSubject.trim() || !composeMessage.trim()) return;
    setComposeSending(true); setComposeStatus("");
    try {
      const res = await fetch("/api/admin/brands/broadcast", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: emails, subject: composeSubject, message: composeMessage, cc: composeCc }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposeStatus(`Sent ${data.sent}${data.failed ? ` · ${data.failed} failed` : ""}`);
        if (!data.failed) setTimeout(() => setShowCompose(false), 900);
      } else {
        setComposeStatus(`Error: ${data.error || "send failed"}`);
      }
    } catch (e: any) {
      setComposeStatus(`Error: ${e?.message || "send failed"}`);
    }
    setComposeSending(false);
  };

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    const res = await fetch("/api/admin/brands", { headers });
    if (res.ok) setContacts((await res.json()).contacts || []);
    setLoadingContacts(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    const res = await fetch("/api/admin/brands/invoices", { headers });
    if (res.ok) setInvoices((await res.json()).invoices || []);
    setLoadingInvoices(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInbox = useCallback(async () => {
    setLoadingInbox(true);
    const res = await fetch("/api/admin/contact", { headers });
    if (res.ok) {
      const data = await res.json();
      setBrandMessages((data.submissions || []).filter((s: ContactSubmission) => s.inbox === "Brands"));
    }
    setLoadingInbox(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { if (view === "invoices") fetchInvoices(); }, [view, fetchInvoices]);
  useEffect(() => { if (view === "inbox") fetchInbox(); }, [view, fetchInbox]);
  useEffect(() => { if (view === "orders") fetchOrders(); }, [view, fetchOrders]);

  const openAdd = () => { setContactForm({ ...BLANK_CONTACT, brands: [{ ...BLANK_BRAND }] }); setEditContact(null); setShowAddContact(true); };
  const openEdit = (c: BrandContact) => { setEditContact(c); setContactForm({ contact_name: c.contact_name, contact_email: c.contact_email, contact_phone: c.contact_phone || "", contact_type: c.contact_type as typeof BLANK_CONTACT.contact_type, brands: c.brands.length ? c.brands : [{ ...BLANK_BRAND }], distributor: c.distributor || "", supplier: c.supplier || "", notes: c.notes || "" }); setShowAddContact(true); };

  const saveContact = async () => {
    setSavingContact(true);
    const payload = { ...contactForm, brands: contactForm.brands.filter(b => b.name.trim()) };
    const url = editContact ? `/api/admin/brands` : `/api/admin/brands`;
    const method = editContact ? "PATCH" : "POST";
    const body = editContact ? { id: editContact.id, ...payload } : payload;
    const res = await fetch(url, { method, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { await fetchContacts(); setShowAddContact(false); }
    setSavingContact(false);
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this brand contact?")) return;
    await fetch("/api/admin/brands", { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchContacts();
  };

  const addBrandRow = () => setContactForm(f => ({ ...f, brands: [...f.brands, { ...BLANK_BRAND }] }));
  const removeBrandRow = (i: number) => setContactForm(f => ({ ...f, brands: f.brands.filter((_, idx) => idx !== i) }));
  const updateBrand = (i: number, field: keyof BrandEntry, val: string) => setContactForm(f => ({ ...f, brands: f.brands.map((b, idx) => idx === i ? { ...b, [field]: val } : b) }));

  const addLineItem = () => setInvoiceForm(f => ({ ...f, line_items: [...f.line_items, { ...BLANK_LINE_ITEM }] }));
  const removeLineItem = (i: number) => setInvoiceForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  const updateLineItem = (i: number, field: string, val: string | number) => {
    setInvoiceForm(f => {
      const items = f.line_items.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: val };
        updated.total = updated.quantity * updated.unit_price;
        return updated;
      });
      return { ...f, line_items: items };
    });
  };

  const saveInvoice = async () => {
    setSavingInvoice(true);
    const res = await fetch("/api/admin/brands/invoices", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(invoiceForm) });
    if (res.ok) { await fetchInvoices(); setShowNewInvoice(false); setInvoiceForm({ brand_contact_id: "", event_name: "", due_date: "", notes: "", line_items: [{ ...BLANK_LINE_ITEM }] }); }
    setSavingInvoice(false);
  };

  const sendReply = async () => {
    if (!selectedMsg || !reply.trim()) return;
    setSending(true);
    await fetch("/api/admin/contact", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedMsg.id, reply, from: "brands@mail.tequilafestusa.com" }) });
    setReply("");
    setSending(false);
    fetchInbox();
  };

  const invoiceTotal = invoiceForm.line_items.reduce((s, i) => s + i.total, 0);
  const filteredContacts = contacts.filter(c => !contactSearch || c.contact_name.toLowerCase().includes(contactSearch.toLowerCase()) || c.contact_email.toLowerCase().includes(contactSearch.toLowerCase()) || c.brands.some(b => b.name.toLowerCase().includes(contactSearch.toLowerCase())));

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50";
  const labelCls = "block text-xs text-white/40 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display text-white">Brands</h2>
          <p className="text-white/40 text-sm mt-0.5">Tequila brand contacts, invoicing & inbox</p>
        </div>
        <div className="flex gap-2">
          {(["inbox", "orders", "contacts", "invoices"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${view === v ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white border border-white/10"}`}>
              {v}
              {v === "inbox" && brandMessages.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{brandMessages.filter(m => m.status === "new").length || ""}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTACTS ── */}
      {view === "contacts" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search brands or contacts…" className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold rounded-xl transition-all cursor-pointer">
              <Plus size={15} /> Add Brand
            </button>
          </div>

          {loadingContacts ? (
            <div className="text-white/30 text-sm py-10 text-center">Loading…</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-white/30 text-sm py-10 text-center">No brand contacts yet.</div>
          ) : (
            <div className="grid gap-3">
              {filteredContacts.map(c => (
                <div key={c.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-white">{c.contact_name}</p>
                        <span className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5 capitalize">{CONTACT_TYPES.find(t => t.value === c.contact_type)?.label}</span>
                      </div>
                      <p className="text-white/50 text-sm mt-0.5">{c.contact_email}{c.contact_phone ? ` · ${c.contact_phone}` : ""}</p>
                      {(c.distributor || c.supplier) && (
                        <p className="text-white/30 text-xs mt-1">{c.distributor ? `Distributor: ${c.distributor}` : ""}{c.distributor && c.supplier ? " · " : ""}{c.supplier ? `Supplier: ${c.supplier}` : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setShowNewInvoice(true); setView("invoices"); setInvoiceForm(f => ({ ...f, brand_contact_id: c.id })); }}
                        className="text-xs border border-white/10 text-white/50 hover:text-yellow-400 hover:border-yellow-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                        + Invoice
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-white/30 hover:text-yellow-400 transition-colors cursor-pointer"><Edit2 size={14} /></button>
                      <button onClick={() => deleteContact(c.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {c.brands.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.brands.map((b, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-white/80 font-medium">{b.name}</span>
                          {b.price_per_bottle && <span className="text-white/40 ml-2">${b.price_per_bottle}/btl</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BRAND PACKAGE ORDERS ── */}
      {view === "orders" && (
        <div className="space-y-3">
          {loadingOrders ? <div className="text-white/30 text-sm py-10 text-center">Loading…</div>
            : orders.length === 0 ? <div className="text-white/30 text-sm py-10 text-center">No brand package orders yet.</div>
            : orders.map(o => (
              <div key={o.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-mono text-yellow-400 text-sm">{o.order_number}</p>
                    <span className={`text-xs rounded-full px-2 py-0.5 border capitalize ${o.status === "paid" ? "bg-green-500/15 text-green-400 border-green-500/20" : o.status === "pending" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : o.status === "refunded" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-white/5 text-white/40 border-white/10"}`}>{o.status}</span>
                    <span className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-white/60">{o.tier}</span>
                  </div>
                  <p className="text-white font-semibold mt-1">{o.brand_name}</p>
                  <p className="text-white/50 text-sm">{o.contact_name} · <a href={`mailto:${o.contact_email}`} className="hover:text-yellow-400">{o.contact_email}</a>{o.contact_phone ? ` · ${o.contact_phone}` : ""}</p>
                  <p className="text-white/40 text-xs mt-1">{(o.cities || []).map(c => CITY_LABELS_BRAND[c] || c).join(", ")}</p>
                  <p className="text-white/25 text-xs mt-1">{new Date(o.created_at).toLocaleString()}{o.paid_at ? ` · paid ${new Date(o.paid_at).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-2xl text-white">${Number(o.amount).toFixed(2)}</p>
                  <p className="text-white/30 text-xs">{(o.cities || []).length} {((o.cities || []).length === 1 ? "city" : "cities")}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── INVOICES ── */}
      {view === "invoices" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowNewInvoice(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold rounded-xl transition-all cursor-pointer">
              <Plus size={15} /> New Invoice
            </button>
          </div>
          {loadingInvoices ? <div className="text-white/30 text-sm py-10 text-center">Loading…</div> : invoices.length === 0 ? (
            <div className="text-white/30 text-sm py-10 text-center">No invoices yet.</div>
          ) : (
            <div className="grid gap-3">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-yellow-400 text-sm">{inv.invoice_number}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 border ${inv.status === "paid" ? "bg-green-500/15 text-green-400 border-green-500/20" : inv.status === "sent" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : inv.status === "cancelled" ? "bg-red-500/15 text-red-400 border-red-500/20" : "bg-white/5 text-white/40 border-white/10"} capitalize`}>{inv.status}</span>
                    </div>
                    <p className="text-white/80 text-sm mt-0.5">{inv.brand_contacts?.contact_name || "—"}{inv.event_name ? ` · ${inv.event_name}` : ""}</p>
                    {inv.due_date && <p className="text-white/30 text-xs mt-0.5">Due {inv.due_date}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-white">${inv.total.toFixed(2)}</p>
                    {inv.stripe_payment_link_url && (
                      <a href={inv.stripe_payment_link_url} target="_blank" rel="noopener noreferrer" className="text-xs border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-500/10 transition-all">Payment Link ↗</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INBOX ── */}
      {view === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">brands@mail.tequilafestusa.com</p>
              <button onClick={openCompose} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg transition-all cursor-pointer">
                <Plus size={13} /> Compose
              </button>
            </div>
            {loadingInbox ? <div className="text-white/30 text-sm py-6 text-center">Loading…</div> : brandMessages.length === 0 ? (
              <div className="text-white/30 text-sm py-6 text-center">No messages yet.</div>
            ) : brandMessages.map(msg => (
              <button key={msg.id} onClick={() => { setSelectedMsg(msg); setReply(""); }}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${selectedMsg?.id === msg.id ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                <p className="font-semibold text-sm text-white truncate">{msg.name}</p>
                <p className="text-white/40 text-xs truncate">{msg.subject}</p>
                <p className="text-white/25 text-xs mt-1">{new Date(msg.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
          <div>
            {selectedMsg ? (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-lg">{selectedMsg.subject}</p>
                    <p className="text-white/40 text-sm">{selectedMsg.name} · {selectedMsg.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => { setBForwardOpen(o => !o); setBForwardStatus(""); }} className="flex items-center gap-1 text-xs text-white/50 hover:text-yellow-400 cursor-pointer">
                      <Send size={12} /> Forward
                    </button>
                    <button onClick={() => deleteBrandMsg(selectedMsg.id)} className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 cursor-pointer">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
                {bForwardOpen && (
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
                    <input value={bForwardTo} onChange={e => setBForwardTo(e.target.value)} placeholder="forward to (email, comma-separated)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
                    <div className="flex items-center gap-2">
                      <input value={bForwardCc} onChange={e => setBForwardCc(e.target.value)} placeholder="cc (optional, comma-separated)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
                      <button type="button" onClick={() => setBForwardCc(cc => {
                        const tre = "tre.santamaria@condadotacos.com";
                        const list = cc.split(",").map(s => s.trim()).filter(Boolean);
                        return list.includes(tre) ? cc : [...list, tre].join(", ");
                      })} className="text-xs text-yellow-400 hover:text-yellow-300 cursor-pointer whitespace-nowrap">+ Tre</button>
                    </div>
                    <textarea value={bForwardNote} onChange={e => setBForwardNote(e.target.value)} rows={2} placeholder="optional note above the forwarded message"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40 resize-y" />
                    <div className="flex items-center gap-2">
                      <button onClick={forwardBrandMsg} disabled={bForwarding || !bForwardTo.trim()}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-40">
                        {bForwarding ? "Sending…" : "Send Forward"}
                      </button>
                      <button onClick={() => { setBForwardOpen(false); setBForwardTo(""); setBForwardNote(""); }} className="text-xs text-white/40 hover:text-white cursor-pointer">Cancel</button>
                      {bForwardStatus && <span className="text-xs text-white/60 ml-auto">{bForwardStatus}</span>}
                    </div>
                  </div>
                )}
                <p className="text-white/70 text-sm whitespace-pre-wrap">{selectedMsg.message}</p>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 resize-none" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-40">
                    <Send size={14} /> {sending ? "Sending…" : "Send Reply"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-white/20 text-sm py-20">Select a message to read</div>
            )}
          </div>
        </div>
      )}

      {/* ── COMPOSE BROADCAST MODAL ── */}
      <AnimatePresence>
        {showCompose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowCompose(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0d0500] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-white">New Email</h3>
                  <p className="text-white/40 text-xs mt-0.5">From brands@mail.tequilafestusa.com</p>
                </div>
                <button onClick={() => setShowCompose(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls} style={{ margin: 0 }}>Recipients · {composeSelected.size} selected</label>
                    <button onClick={toggleAllRecipients} className="text-xs text-yellow-400 hover:text-yellow-300 cursor-pointer">
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={composeSearch} onChange={e => setComposeSearch(e.target.value)} placeholder="Search contacts or brands…"
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/40" />
                  </div>
                  <div className="border border-white/10 rounded-xl max-h-56 overflow-y-auto">
                    {composeFiltered.length === 0 ? (
                      <p className="text-white/30 text-sm py-6 text-center">No brand contacts.</p>
                    ) : composeFiltered.map(c => {
                      const checked = composeSelected.has(c.id);
                      return (
                        <label key={c.id} className={`flex items-center gap-3 px-3 py-2 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/[0.03] ${checked ? "bg-yellow-500/[0.06]" : ""}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleRecipient(c.id)} className="accent-yellow-500" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{c.contact_name} <span className="text-white/40">· {c.contact_email}</span></p>
                            {c.brands.length > 0 && <p className="text-white/30 text-xs truncate">{c.brands.map(b => b.name).filter(Boolean).join(", ")}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls} style={{ margin: 0 }}>CC (optional)</label>
                    <button type="button" onClick={() => setComposeCc(cc => {
                      const tre = "tre.santamaria@condadotacos.com";
                      const list = cc.split(",").map(s => s.trim()).filter(Boolean);
                      return list.includes(tre) ? cc : [...list, tre].join(", ");
                    })} className="text-xs text-yellow-400 hover:text-yellow-300 cursor-pointer">
                      + Tre Santamaria
                    </button>
                  </div>
                  <input value={composeCc} onChange={e => setComposeCc(e.target.value)} className={inputCls} placeholder="cc@example.com, another@example.com" />
                </div>
                <div>
                  <label className={labelCls}>Subject</label>
                  <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className={inputCls} placeholder="Subject line" />
                </div>
                <div>
                  <label className={labelCls}>Message</label>
                  <textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)} rows={8}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 resize-y" placeholder="Write your message…" />
                </div>

                {composeStatus && <p className="text-sm text-white/60">{composeStatus}</p>}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white cursor-pointer">Cancel</button>
                  <button onClick={sendBroadcast}
                    disabled={composeSending || composeSelected.size === 0 || !composeSubject.trim() || !composeMessage.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-40">
                    <Send size={14} /> {composeSending ? "Sending…" : `Send to ${composeSelected.size}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD/EDIT CONTACT MODAL ── */}
      <AnimatePresence>
        {showAddContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowAddContact(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0d0500] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{editContact ? "Edit Brand Contact" : "Add Brand Contact"}</h3>
                <button onClick={() => setShowAddContact(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Contact Name *</label>
                    <input value={contactForm.contact_name} onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))} className={inputCls} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className={labelCls}>Type *</label>
                    <select value={contactForm.contact_type} onChange={e => setContactForm(f => ({ ...f, contact_type: e.target.value as typeof f.contact_type }))} className={inputCls}>
                      {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Contact Email *</label>
                    <input value={contactForm.contact_email} onChange={e => setContactForm(f => ({ ...f, contact_email: e.target.value }))} className={inputCls} placeholder="jane@brand.com" type="email" />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Phone</label>
                    <input value={contactForm.contact_phone} onChange={e => setContactForm(f => ({ ...f, contact_phone: e.target.value }))} className={inputCls} placeholder="(555) 000-0000" type="tel" />
                  </div>
                  <div>
                    <label className={labelCls}>Distributor</label>
                    <input value={contactForm.distributor} onChange={e => setContactForm(f => ({ ...f, distributor: e.target.value }))} className={inputCls} placeholder="Southern Glazer's, etc." />
                  </div>
                  <div>
                    <label className={labelCls}>Supplier</label>
                    <input value={contactForm.supplier} onChange={e => setContactForm(f => ({ ...f, supplier: e.target.value }))} className={inputCls} placeholder="Supplier name" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls} style={{ margin: 0 }}>Brand Names &amp; Bottle Pricing</label>
                    <button onClick={addBrandRow} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer"><Plus size={12} /> Add Brand</button>
                  </div>
                  <div className="space-y-2">
                    {contactForm.brands.map((b, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={b.name} onChange={e => updateBrand(i, "name", e.target.value)} className={inputCls} placeholder="Brand name" />
                        <input value={b.price_per_bottle} onChange={e => updateBrand(i, "price_per_bottle", e.target.value)} className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50 flex-shrink-0" placeholder="$/bottle" />
                        {contactForm.brands.length > 1 && (
                          <button onClick={() => removeBrandRow(i)} className="text-white/30 hover:text-red-400 cursor-pointer flex-shrink-0"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} placeholder="Internal notes…" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowAddContact(false)} className="flex-1 py-2.5 border border-white/10 text-white/50 rounded-xl text-sm hover:text-white transition-all cursor-pointer">Cancel</button>
                  <button onClick={saveContact} disabled={savingContact || !contactForm.contact_name || !contactForm.contact_email}
                    className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-40">
                    {savingContact ? "Saving…" : editContact ? "Save Changes" : "Add Contact"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NEW INVOICE MODAL ── */}
      <AnimatePresence>
        {showNewInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowNewInvoice(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0d0500] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">New Brand Invoice</h3>
                <button onClick={() => setShowNewInvoice(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Brand Contact *</label>
                    <select value={invoiceForm.brand_contact_id} onChange={e => setInvoiceForm(f => ({ ...f, brand_contact_id: e.target.value }))} className={inputCls}>
                      <option value="">Select a contact…</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.contact_name}{c.brands.length ? ` (${c.brands.map(b => b.name).join(", ")})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Event</label>
                    <input value={invoiceForm.event_name} onChange={e => setInvoiceForm(f => ({ ...f, event_name: e.target.value }))} className={inputCls} placeholder="e.g. Cincinnati 2026" />
                  </div>
                  <div>
                    <label className={labelCls}>Due Date</label>
                    <input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls} style={{ margin: 0 }}>Line Items</label>
                    <button onClick={addLineItem} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer"><Plus size={12} /> Add Line</button>
                  </div>
                  <div className="space-y-2">
                    {invoiceForm.line_items.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr,80px,100px,80px,auto] gap-2 items-center">
                        <input value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} className={inputCls} placeholder="Description" />
                        <input type="number" min={1} value={item.quantity} onChange={e => updateLineItem(i, "quantity", Number(e.target.value))} className={inputCls} placeholder="Qty" />
                        <input type="number" min={0} value={item.unit_price || ""} onChange={e => updateLineItem(i, "unit_price", Number(e.target.value))} className={inputCls} placeholder="Unit $" />
                        <div className="text-right text-yellow-400 text-sm font-semibold">${item.total.toFixed(2)}</div>
                        {invoiceForm.line_items.length > 1 && (
                          <button onClick={() => removeLineItem(i)} className="text-white/30 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-right mt-3 text-lg font-bold text-white">Total: <span className="text-yellow-400">${invoiceTotal.toFixed(2)}</span></div>
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} placeholder="Invoice notes…" />
                </div>
                <p className="text-white/30 text-xs">A Stripe payment link will be generated and emailed to the brand contact automatically.</p>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowNewInvoice(false)} className="flex-1 py-2.5 border border-white/10 text-white/50 rounded-xl text-sm hover:text-white transition-all cursor-pointer">Cancel</button>
                  <button onClick={saveInvoice} disabled={savingInvoice || !invoiceForm.brand_contact_id || invoiceTotal === 0}
                    className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-40">
                    {savingInvoice ? "Creating…" : "Create & Send Invoice"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Staff Section ────────────────────────────────────────────────────────────
const PERMISSION_OPTIONS = [
  { id: "checkin", label: "Event Check-In",  desc: "Access to the door check-in portal" },
  { id: "orders",  label: "View Orders",      desc: "Read-only access to order list" },
  { id: "inbox",   label: "Contact Inbox",    desc: "View and reply to contact messages" },
  { id: "events",  label: "View Events",      desc: "View event details and ticket counts" },
];

interface StaffMember {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  status: string;
  last_login_at: string | null;
  created_at: string;
}

function StaffSection({ adminToken }: { adminToken: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerms, setInvitePerms] = useState<string[]>(["checkin"]);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const headers = { "x-admin-token": adminToken };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/staff", { headers: headers as any });
    if (res.ok) setStaff(await res.json());
    setLoading(false);
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    setInviteError(""); setInviteSuccess("");
    if (!inviteName || !inviteEmail) { setInviteError("Name and email required"); return; }
    if (!invitePerms.length) { setInviteError("Select at least one permission"); return; }
    setInviting(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" } as any,
      body: JSON.stringify({ name: inviteName, email: inviteEmail, permissions: invitePerms }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteSuccess(`Invite sent to ${inviteEmail}!`);
      setInviteName(""); setInviteEmail(""); setInvitePerms(["checkin"]);
      setShowInvite(false);
      load();
    } else {
      setInviteError(data.error || "Failed to send invite");
    }
    setInviting(false);
  };

  const removeStaff = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from staff?`)) return;
    await fetch(`/api/admin/staff/${id}`, { method: "DELETE", headers: headers as any });
    load();
  };

  const resendInvite = async (id: string) => {
    await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" } as any,
      body: JSON.stringify({ action: "resend_invite" }),
    });
    alert("Invite resent!");
  };

  const togglePerm = (perm: string) => {
    setInvitePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const STATUS_COLORS: Record<string, string> = {
    active:  "#22c55e",
    invited: "#F5A623",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-white text-2xl">STAFF</h2>
          <p className="text-white/40 text-sm mt-0.5">Invite team members and manage their portal access</p>
        </div>
        <button onClick={() => { setShowInvite(!showInvite); setInviteError(""); setInviteSuccess(""); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer">
          <Plus size={15} /> Invite Staff
        </button>
      </div>

      {/* Invite success toast */}
      {inviteSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle size={16} /> {inviteSuccess}
        </div>
      )}

      {/* Invite form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-6 space-y-5">
              <h3 className="font-bold text-white text-lg">Invite a Team Member</h3>

              {inviteError && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2">{inviteError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Full Name *</label>
                  <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Their name"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="their@email.com"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="text-white/30 text-xs uppercase tracking-wider mb-3 block">Permissions *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map(opt => {
                    const checked = invitePerms.includes(opt.id);
                    return (
                      <button key={opt.id} type="button" onClick={() => togglePerm(opt.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          checked ? "bg-yellow-500/10 border-yellow-500/40" : "bg-white/[0.02] border-white/10 hover:border-white/20"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          checked ? "bg-yellow-500 border-yellow-500" : "border-white/30"
                        }`}>
                          {checked && <span className="text-black text-[10px] font-black">✓</span>}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${checked ? "text-yellow-400" : "text-white/70"}`}>{opt.label}</p>
                          <p className="text-white/30 text-xs mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={invite} disabled={inviting}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                  <Send size={14} /> {inviting ? "Sending..." : "Send Invite"}
                </button>
                <button onClick={() => setShowInvite(false)}
                  className="text-white/40 hover:text-white/70 text-sm px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff list */}
      {loading ? (
        <div className="text-center py-10 text-white/30 text-sm">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center">
          <Users size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No staff members yet</p>
          <p className="text-white/15 text-xs mt-1">Click &ldquo;Invite Staff&rdquo; to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="text-white font-semibold text-sm">{member.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                      style={{ color: STATUS_COLORS[member.status] || "#aaa", borderColor: `${STATUS_COLORS[member.status] || "#aaa"}40`, background: `${STATUS_COLORS[member.status] || "#aaa"}10` }}>
                      {member.status}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs mb-3">{member.email}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.permissions.map((p: string) => {
                      const opt = PERMISSION_OPTIONS.find(o => o.id === p);
                      return (
                        <span key={p} className="text-xs px-2.5 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/80">
                          {opt?.label || p}
                        </span>
                      );
                    })}
                  </div>
                  {member.last_login_at && (
                    <p className="text-white/20 text-xs mt-2">
                      Last login: {new Date(member.last_login_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.status === "invited" && (
                    <button onClick={() => resendInvite(member.id)}
                      className="text-yellow-400/60 hover:text-yellow-400 text-xs px-3 py-1.5 rounded-lg border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer">
                      Resend
                    </button>
                  )}
                  <button onClick={() => removeStaff(member.id, member.name)}
                    className="text-red-400/50 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick link to check-in */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm font-semibold">Check-In Portal</p>
          <p className="text-white/25 text-xs mt-0.5">Share this link with door staff</p>
        </div>
        <a href="/checkin" target="_blank"
          className="flex items-center gap-2 text-yellow-400 text-sm border border-yellow-500/30 hover:border-yellow-500/60 px-4 py-2 rounded-xl transition-all">
          <QrCode size={14} /> Open Portal
        </a>
      </div>
    </div>
  );
}

// ─── Knowledge Base Section ────────────────────────────────────────────────────
const KB_CATEGORIES = ["General", "Events", "Tickets", "Policies", "Account", "VIP"];

interface KBArticle { id: string; title: string; content: string; category: string; active: boolean; }

function KnowledgeBaseSection({ adminToken }: { adminToken: string }) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "General" });
  const [saving, setSaving] = useState(false);
  const headers = { "x-admin-token": adminToken };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/knowledge-base", { headers: headers as any });
    if (res.ok) setArticles(await res.json());
    setLoading(false);
  }, [adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/knowledge-base/${editing.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" } as any,
        body: JSON.stringify({ title: form.title, content: form.content, category: form.category }),
      });
    } else {
      await fetch("/api/admin/knowledge-base", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" } as any,
        body: JSON.stringify(form),
      });
    }
    setEditing(null); setShowAdd(false); setForm({ title: "", content: "", category: "General" });
    load(); setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/admin/knowledge-base/${id}`, { method: "DELETE", headers: headers as any });
    load();
  };

  const toggleActive = async (article: KBArticle) => {
    await fetch(`/api/admin/knowledge-base/${article.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" } as any,
      body: JSON.stringify({ active: !article.active }),
    });
    load();
  };

  const startEdit = (a: KBArticle) => { setEditing(a); setForm({ title: a.title, content: a.content, category: a.category }); setShowAdd(true); };

  const grouped = KB_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = articles.filter(a => a.category === cat);
    return acc;
  }, {} as Record<string, KBArticle[]>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-lg">Knowledge Base</p>
          <p className="text-white/30 text-sm">{articles.filter(a => a.active).length} active articles · powers AI replies & chat bot</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditing(null); setForm({ title: "", content: "", category: "General" }); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-xl transition-all cursor-pointer">
          <Plus size={14} /> Add Article
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-5 space-y-3">
              <p className="font-bold text-white">{editing ? "Edit Article" : "New Article"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-white placeholder-white/25 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full appearance-none bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white outline-none text-sm cursor-pointer">
                    {KB_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0500]">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Content *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4}
                  placeholder="Write the article content. This is what the AI uses to answer questions."
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={save} disabled={saving || !form.title || !form.content}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Article"}
                </button>
                <button onClick={() => { setShowAdd(false); setEditing(null); }}
                  className="text-white/40 hover:text-white/70 text-sm px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-white/25 text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).filter(([, items]) => items.length > 0).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-white/30 text-xs uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map(a => (
                  <div key={a.id} className={`bg-white/[0.03] border rounded-xl px-4 py-3 transition-all ${a.active ? "border-white/10" : "border-white/[0.04] opacity-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${a.active ? "text-white" : "text-white/40"}`}>{a.title}</p>
                        <p className="text-white/30 text-xs mt-1 line-clamp-2">{a.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => toggleActive(a)} title={a.active ? "Disable" : "Enable"}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${a.active ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-white/30"}`}>
                          {a.active ? "On" : "Off"}
                        </button>
                        <button onClick={() => startEdit(a)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-all cursor-pointer"><Edit2 size={12} /></button>
                        <button onClick={() => del(a.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Newsletter Section ────────────────────────────────────────────────────────
const NEWSLETTER_CITIES = ["All", "Cincinnati", "Cleveland", "Columbus", "Phoenix"];

function NewsletterSection({ adminToken }: { adminToken: string }) {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityTab, setCityTab] = useState("All");

  useEffect(() => {
    fetch("/api/admin/newsletter", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json())
      .then(d => { setSubscribers(d.subscribers || []); setLoading(false); });
  }, [adminToken]);

  // Count per city (subscribers with no cities selected count toward all)
  const cityCount = (city: string) => {
    if (city === "All") return subscribers.length;
    return subscribers.filter(s =>
      !s.cities?.length || s.cities.includes(city)
    ).length;
  };

  const filtered = subscribers.filter(s => {
    const matchesCity = cityTab === "All" || !s.cities?.length || s.cities.includes(cityTab);
    const matchesSearch = `${s.first_name} ${s.email} ${s.phone || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesCity && matchesSearch;
  });

  const exportCSV = () => {
    const source = cityTab === "All" ? subscribers : filtered;
    const rows = [["First Name", "Email", "Phone", "Cities", "Signed Up"]];
    for (const s of source) {
      rows.push([
        s.first_name,
        s.email,
        s.phone || "",
        (s.cities?.join(", ")) || "All Cities",
        new Date(s.created_at).toLocaleDateString(),
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_${cityTab.toLowerCase().replace(" ", "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-white text-3xl mb-1">NEWSLETTER</h2>
          <p className="text-white/30 text-sm">{subscribers.length} total subscriber{subscribers.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white px-4 py-2 rounded-xl text-sm transition-all cursor-pointer">
          <Download size={14} /> Export {cityTab !== "All" ? cityTab : "All"} CSV
        </button>
      </div>

      {/* City stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {NEWSLETTER_CITIES.filter(c => c !== "All").map(city => (
          <button key={city} onClick={() => setCityTab(city)}
            className={`rounded-xl p-4 border text-left transition-all cursor-pointer ${
              cityTab === city
                ? "bg-yellow-500/10 border-yellow-500/40"
                : "bg-white/[0.03] border-white/10 hover:border-white/20"
            }`}>
            <p className={`text-2xl font-bold ${cityTab === city ? "text-yellow-400" : "text-white"}`}>
              {cityCount(city)}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{city}</p>
          </button>
        ))}
      </div>

      {/* City tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit">
        {NEWSLETTER_CITIES.map(city => (
          <button key={city} onClick={() => setCityTab(city)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              cityTab === city
                ? "bg-yellow-500 text-black"
                : "text-white/50 hover:text-white"
            }`}>
            {city} {city !== "All" && <span className="opacity-60 text-xs">({cityCount(city)})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${cityTab === "All" ? "all subscribers" : cityTab + " subscribers"}...`}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-yellow-500/40" />
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/30 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-white/30 text-sm">
            {search ? "No matches found" : `No ${cityTab === "All" ? "" : cityTab + " "}subscribers yet`}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-white/40 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-white/40 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-white/40 font-medium hidden sm:table-cell">Phone</th>
                <th className="text-left px-5 py-3 text-white/40 font-medium hidden md:table-cell">Cities</th>
                <th className="text-left px-5 py-3 text-white/40 font-medium hidden lg:table-cell">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3 text-white font-medium">{s.first_name}</td>
                  <td className="px-5 py-3 text-white/60">{s.email}</td>
                  <td className="px-5 py-3 text-white/40 hidden sm:table-cell">{s.phone || <span className="text-white/20">—</span>}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {s.cities?.length
                      ? <div className="flex flex-wrap gap-1">
                          {s.cities.map((c: string) => (
                            <span key={c} className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{c}</span>
                          ))}
                        </div>
                      : <span className="text-white/20 text-xs">All Cities</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-white/40 hidden lg:table-cell">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Vendors Section ───────────────────────────────────────────────────────────
const VENDOR_STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  paid:     "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

function VendorsSection({ adminToken }: { adminToken: string }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchApps = () => {
    fetch("/api/admin/vendors", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json())
      .then(d => { setApps(d.applications || []); setLoading(false); });
  };

  useEffect(() => { fetchApps(); }, [adminToken]);

  const counts = {
    all:      apps.length,
    pending:  apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    paid:     apps.filter(a => a.paid).length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };

  const filtered = filter === "all" ? apps : filter === "paid" ? apps.filter(a => a.paid) : apps.filter(a => a.status === filter);

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ id, status, admin_notes: notes }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.application) {
      setApps(prev => prev.map(a => a.id === id ? data.application : a));
      setSelected(data.application);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-white text-3xl mb-1">VENDORS</h2>
        <p className="text-white/30 text-sm">{apps.length} application{apps.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all","pending","approved","paid","rejected"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
              filter === tab ? "bg-yellow-500 border-yellow-500 text-black" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} <span className="opacity-60">({counts[tab]})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="text-white/30 text-sm py-8 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-white/30 text-sm py-8 text-center">No {filter === "all" ? "" : filter} applications</div>
          ) : filtered.map(app => (
            <button key={app.id} onClick={() => { setSelected(app); setNotes(app.admin_notes || ""); }}
              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                selected?.id === app.id ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{app.business_name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{app.name} · {app.vendor_type}</p>
                  <p className="text-white/30 text-xs mt-0.5">{app.cities?.join(", ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${VENDOR_STATUS_STYLES[app.paid ? "paid" : app.status] || VENDOR_STATUS_STYLES.pending}`}>
                    {app.paid ? "Paid" : app.status}
                  </span>
                  <span className="text-white/20 text-xs">{new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 text-center text-white/20 text-sm h-full flex items-center justify-center">
              Select an application to review
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold text-xl">{selected.business_name}</h3>
                  <p className="text-white/40 text-sm">{selected.vendor_type}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${VENDOR_STATUS_STYLES[selected.paid ? "paid" : selected.status] || VENDOR_STATUS_STYLES.pending}`}>
                  {selected.paid ? "Paid" : selected.status}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Contact", selected.name],
                  ["Email", selected.email],
                  ["Phone", selected.phone || "—"],
                  ["Cities", selected.cities?.join(", ") || "—"],
                  ["Fee", `$${150 * (selected.cities?.length || 1)} (${selected.cities?.length || 1} city × $150)`],
                  ["Applied", new Date(selected.created_at).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                    <p className="text-white/35 text-xs uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-white/80 font-medium break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selected.description && (
                <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                  <p className="text-white/35 text-xs uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white/70 text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}

              {/* Payment link */}
              {selected.payment_link && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Payment Link Sent</p>
                    <p className="text-white/40 text-xs mt-0.5">Stripe checkout link was emailed to vendor</p>
                  </div>
                  <a href={selected.payment_link} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs underline flex-shrink-0">View Link</a>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Admin Notes (included in rejection email)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/40 rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none placeholder-white/20"
                  placeholder="Optional notes for vendor..." />
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(selected.id, "approved")} disabled={saving}
                    className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                    {saving ? "Processing..." : "✓ Approve & Send Payment Link"}
                  </button>
                  <button onClick={() => updateStatus(selected.id, "rejected")} disabled={saving}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-60 text-red-400 font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                    ✗ Reject
                  </button>
                </div>
              )}
              {selected.status === "approved" && !selected.paid && (
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(selected.id, "approved")} disabled={saving}
                    className="bg-white/5 hover:bg-white/10 border border-white/15 text-white/60 font-bold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer">
                    {saving ? "Sending..." : "Resend Payment Link"}
                  </button>
                  <button onClick={() => updateStatus(selected.id, "rejected")} disabled={saving}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer">
                    Reject
                  </button>
                </div>
              )}
              {selected.status === "rejected" && (
                <button onClick={() => updateStatus(selected.id, "approved")} disabled={saving}
                  className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-bold py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                  Re-approve & Send Payment Link
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tools Section ─────────────────────────────────────────────────────────────
function SocialClaimsSection({ adminToken }: { adminToken: string }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const headers = { "x-admin-token": adminToken };

  const fetchClaims = async () => {
    const res = await fetch("/api/admin/social-claims", { headers });
    const data = await res.json();
    setClaims(data.claims || []);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (claim_id: string, action: "approve" | "reject") => {
    setActing(claim_id + action);
    await fetch("/api/admin/social-claims", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ claim_id, action }),
    });
    await fetchClaims();
    setActing(null);
  };

  const pending = claims.filter(c => c.status === "pending");
  const reviewed = claims.filter(c => c.status !== "pending");

  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">SOCIAL SHARE CLAIMS</h2>

      <div className="space-y-8">
        {/* Pending */}
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Pending Review ({pending.length})</p>
          {loading ? (
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
          ) : pending.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center text-white/30 text-sm">No pending claims</div>
          ) : (
            <div className="space-y-3">
              {pending.map(c => (
                <div key={c.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 uppercase">{c.platform}</span>
                      <span className="text-white/30 text-xs">{c.event_id}</span>
                      <span className="text-white/20 text-xs ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <a href={c.post_url} target="_blank" rel="noopener noreferrer"
                      className="text-yellow-400 text-sm hover:underline break-all truncate block">{c.post_url}</a>
                    {c.customer_email && <p className="text-white/40 text-xs mt-1">{c.customer_email}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => act(c.id, "approve")} disabled={!!acting}
                      className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50">
                      {acting === c.id + "approve" ? "..." : "✓ Approve (+75 pts)"}
                    </button>
                    <button onClick={() => act(c.id, "reject")} disabled={!!acting}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50">
                      {acting === c.id + "reject" ? "..." : "✗ Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviewed */}
        {reviewed.length > 0 && (
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Reviewed ({reviewed.length})</p>
            <div className="space-y-2">
              {reviewed.slice(0, 20).map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.status === "approved" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {c.status}
                  </span>
                  <span className="text-white/30 text-xs uppercase">{c.platform}</span>
                  <a href={c.post_url} target="_blank" rel="noopener noreferrer" className="text-white/40 text-xs hover:text-yellow-400 truncate flex-1">{c.post_url}</a>
                  {c.points_awarded > 0 && <span className="text-green-400 text-xs font-bold">+{c.points_awarded} pts</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolsSection({ adminToken }: { adminToken: string }) {
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const [blasting, setBlasting] = useState(false);
  const [blastResult, setBlastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [blastError, setBlastError] = useState("");

  const sendClaimBlast = async () => {
    if (!confirm(`This will email all ticket buyers who haven't created an account yet. Continue?`)) return;
    setBlasting(true);
    setBlastResult(null);
    setBlastError("");
    try {
      const res = await fetch("/api/admin/email-blast/claim-account", {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json();
      if (res.ok) {
        setBlastResult(data);
      } else {
        setBlastError(data.error || "Blast failed");
      }
    } catch {
      setBlastError("Network error");
    } finally {
      setBlasting(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncDone(false);
    setSyncLog(["Starting sync..."]);

    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    });

    if (!res.body) { setSyncLog(["Error: no response"]); setSyncing(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const { msg } = JSON.parse(line.slice(6));
            setSyncLog(prev => [...prev, msg]);
            if (msg.startsWith("✅ Done") || msg.includes("up to date")) setSyncDone(true);
          } catch { /* skip */ }
        }
      }
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-white text-3xl mb-1">TOOLS</h2>
        <p className="text-white/30 text-sm">Admin utilities and data management</p>
      </div>

      {/* Claim Account Email Blast */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Mail size={18} className="text-yellow-400" /> Claim Account Email Blast
            </h3>
            <p className="text-white/40 text-sm mt-1">
              Email all ticket buyers who haven&apos;t created an account yet. Tells them their points are waiting and walks them through signup step-by-step.
            </p>
          </div>
        </div>

        <button onClick={sendClaimBlast} disabled={blasting}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer mb-4">
          <Mail size={15} />
          {blasting ? "Sending..." : "Send Claim Account Emails"}
        </button>

        {blastResult && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm">
            <p className="text-green-400 font-bold">✅ Blast complete</p>
            <p className="text-white/50 mt-1">Sent: {blastResult.sent} · Failed: {blastResult.failed} · Total: {blastResult.total}</p>
          </div>
        )}
        {blastError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{blastError}</p>}
      </div>

      {/* Sync from old site */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <RefreshCw size={18} className="text-yellow-400" /> Sync from Old Site
            </h3>
            <p className="text-white/40 text-sm mt-1">
              Pull any new ticket sales from the old Replit site that aren&apos;t already in the new database.
              Safe to run anytime — duplicate orders are automatically skipped.
            </p>
          </div>
        </div>

        <button onClick={runSync} disabled={syncing}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer mb-4">
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Run Sync Now"}
        </button>

        {syncLog.length > 0 && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
            {syncLog.map((line, i) => (
              <p key={i} className={
                line.startsWith("✅") ? "text-green-400" :
                line.startsWith("❌") ? "text-red-400" :
                line.startsWith("⚠️") ? "text-yellow-400" :
                line.startsWith("🆕") ? "text-blue-400" :
                "text-white/50"
              }>{line}</p>
            ))}
            {syncDone && <p className="text-white/20 mt-2 pt-2 border-t border-white/10">— sync complete —</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview",   label: "Overview",    icon: <LayoutDashboard size={17} /> },
  { id: "orders",     label: "Orders",      icon: <Ticket size={17} /> },
  { id: "events",     label: "Events",      icon: <CalendarDays size={17} /> },
  { id: "customers",  label: "Users",       icon: <Users size={17} /> },
  { id: "brands",     label: "Brands",      icon: <Star size={17} /> },
  { id: "coupons",    label: "Coupons",     icon: <Tag size={17} /> },
  { id: "checkin",    label: "Check-In",    icon: <QrCode size={17} /> },
  { id: "contacts",   label: "Inbox",       icon: <MessageSquare size={17} /> },
  { id: "social",     label: "Social Claims", icon: <Share2 size={17} /> },
  { id: "staff",      label: "Staff",       icon: <Users size={17} /> },
  { id: "vendors",    label: "Vendors",     icon: <Utensils size={17} /> },
  { id: "newsletter", label: "Newsletter",  icon: <Mail size={17} /> },
  { id: "tools",      label: "Tools",       icon: <RefreshCw size={17} /> },
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
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("admin_token") || "";
    return "";
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { orders, stats, events, loading, error, refetch } = useAdminData(adminToken);

  const handleLogin = (token: string) => {
    sessionStorage.setItem("admin_token", token);
    setAdminToken(token);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setAdminToken("");
  };

  // If token was invalidated by API, log out
  if (error === "unauthorized" && adminToken) {
    handleLogout();
  }

  // Refresh data whenever the user switches sections
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
    refetch();
  };

  if (!adminToken) return <AdminLogin onLogin={handleLogin} />;

  const SECTION_MAP: Record<string, React.ReactNode> = {
    overview:  <OverviewSection stats={stats} orders={orders} events={events} loading={loading} />,
    orders:    <OrdersSection orders={orders} loading={loading} adminToken={adminToken} onRefetch={refetch} />,
    events:    <EventsSection adminToken={adminToken} stats={stats} editingId={editingEventId} setEditingId={setEditingEventId} />,
    customers: <UsersSection adminToken={adminToken} />,
    brands:    <BrandsSection adminToken={adminToken} />,
    coupons:   <CouponsSection />,
    checkin:   <CheckInSection />,
    contacts:  <ContactSection adminToken={adminToken} />,
    social:    <SocialClaimsSection adminToken={adminToken} />,
    staff:     <StaffSection adminToken={adminToken} />,
    vendors:    <VendorsSection adminToken={adminToken} />,
    newsletter: <NewsletterSection adminToken={adminToken} />,
    tools:     <ToolsSection adminToken={adminToken} />,
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
            <button key={item.id} onClick={() => { handleSectionChange(item.id); if (item.id === "events") setEditingEventId(null); }}
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
          <button onClick={handleLogout}
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
