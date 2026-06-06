"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Ticket, CalendarDays, Users, Tag, QrCode,
  MessageSquare, FileText, LogOut, Menu, X, TrendingUp, DollarSign,
  RefreshCw, Download, Send, CheckCircle, XCircle, Search, Plus,
  Trash2, Edit2, Eye, AlertCircle, ChevronDown, BarChart2, Settings,
} from "lucide-react";

// ─── Mock data ───────────────────────────────────────────────────────────────
const STATS = {
  totalRevenue: 14850,
  ticketsSold: 247,
  ordersToday: 12,
  checkedIn: 0,
};

const MOCK_ORDERS = [
  { id: "TF-2026-00247", customer: "Sarah Mitchell", email: "sarah@email.com", event: "Cincinnati", type: "All Inclusive", qty: 2, total: 110, status: "confirmed", date: "2026-06-05", paymentId: "pi_3abc" },
  { id: "TF-2026-00246", customer: "Marcus Johnson", email: "marcus@email.com", event: "Cincinnati", type: "VIP", qty: 1, total: 125, status: "confirmed", date: "2026-06-05", paymentId: "pi_3def" },
  { id: "TF-2026-00245", customer: "Emily Torres", email: "emily@email.com", event: "Cleveland", type: "All Inclusive", qty: 4, total: 220, status: "confirmed", date: "2026-06-04", paymentId: "pi_3ghi" },
  { id: "TF-2026-00244", customer: "David Park", email: "david@email.com", event: "Cincinnati", type: "GA Entry", qty: 2, total: 10, status: "confirmed", date: "2026-06-04", paymentId: "pi_3jkl" },
  { id: "TF-2026-00243", customer: "Lisa Chen", email: "lisa@email.com", event: "Columbus", type: "All Inclusive", qty: 1, total: 55, status: "refunded", date: "2026-06-03", paymentId: "pi_3mno" },
  { id: "TF-2026-00242", customer: "James Williams", email: "james@email.com", event: "Phoenix", type: "VIP", qty: 2, total: 250, status: "confirmed", date: "2026-06-03", paymentId: "pi_3pqr" },
];

const MOCK_EVENTS = [
  { id: 1, city: "Cincinnati", date: "June 13, 2026", venue: "Fountain Square", capacity: 500, sold: 247, status: "on_sale", color: "#F5A623" },
  { id: 2, city: "Cleveland", date: "July 25, 2026", venue: "Cuyahoga County Fairgrounds", capacity: 800, sold: 134, status: "on_sale", color: "#C8102E" },
  { id: 3, city: "Columbus", date: "August 8, 2026", venue: "Gravity / GCCC", capacity: 600, sold: 89, status: "on_sale", color: "#00A878" },
  { id: 4, city: "Phoenix", date: "November 14, 2026", venue: "Phoenix Convention Center", capacity: 1000, sold: 43, status: "on_sale", color: "#7B2FBE" },
];

const MOCK_CUSTOMERS = [
  { id: 1, name: "Sarah Mitchell", email: "sarah@email.com", orders: 3, totalSpent: 330, joined: "2026-03-15" },
  { id: 2, name: "Marcus Johnson", email: "marcus@email.com", orders: 1, totalSpent: 125, joined: "2026-06-05" },
  { id: 3, name: "Emily Torres", email: "emily@email.com", orders: 2, totalSpent: 275, joined: "2026-05-20" },
  { id: 4, name: "David Park", email: "david@email.com", orders: 1, totalSpent: 10, joined: "2026-06-04" },
  { id: 5, name: "James Williams", email: "james@email.com", orders: 4, totalSpent: 500, joined: "2026-02-01" },
];

const MOCK_COUPONS = [
  { id: 1, code: "EARLYBIRD10", type: "percentage", value: 10, uses: 45, maxUses: 100, expires: "2026-06-10", active: true },
  { id: 2, code: "CINCINNATI5", type: "fixed", value: 5, uses: 23, maxUses: 50, expires: "2026-06-13", active: true },
  { id: 3, code: "VIP20OFF", type: "percentage", value: 20, uses: 8, maxUses: 25, expires: "2026-07-01", active: false },
];

const MOCK_CONTACTS = [
  { id: 1, name: "Alex Rodriguez", email: "alex@email.com", subject: "Ticket Support", message: "I need to transfer my ticket to a friend.", status: "new", date: "2026-06-05" },
  { id: 2, name: "Jennifer Wu", email: "jen@email.com", subject: "Sponsorship Opportunity", message: "We'd like to discuss sponsoring the Cincinnati event.", status: "read", date: "2026-06-04" },
  { id: 3, name: "Tom Bradley", email: "tom@email.com", subject: "General Inquiry", message: "What is included in the VIP ticket?", status: "replied", date: "2026-06-03" },
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

function OverviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-white text-3xl mb-6">OVERVIEW</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<DollarSign size={18} />} label="Total Revenue" value={`$${STATS.totalRevenue.toLocaleString()}`} sub="All time" color="#F5A623" />
          <StatCard icon={<Ticket size={18} />} label="Tickets Sold" value={STATS.ticketsSold.toString()} sub="Across all cities" color="#00A878" />
          <StatCard icon={<TrendingUp size={18} />} label="Orders Today" value={STATS.ordersToday.toString()} color="#7B2FBE" />
          <StatCard icon={<CheckCircle size={18} />} label="Checked In" value={STATS.checkedIn.toString()} sub="Cincinnati event" color="#C8102E" />
        </div>
      </div>

      {/* Event capacity bars */}
      <div>
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4">Ticket Sales by City</h3>
        <div className="space-y-3">
          {MOCK_EVENTS.map(ev => (
            <div key={ev.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-lg" style={{ color: ev.color }}>{ev.city}</span>
                <span className="text-white/50 text-sm">{ev.sold} / {ev.capacity} sold</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(ev.sold / ev.capacity) * 100}%`, background: ev.color }} />
              </div>
              <p className="text-white/30 text-xs mt-1">{Math.round((ev.sold / ev.capacity) * 100)}% capacity · {ev.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4">Recent Orders</h3>
        <div className="space-y-2">
          {MOCK_ORDERS.slice(0, 5).map(order => (
            <div key={order.id} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white text-sm font-semibold">{order.customer}</p>
                <p className="text-white/40 text-xs">{order.event} · {order.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-white font-bold text-sm">${order.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersSection() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = MOCK_ORDERS.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

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

      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={order.status} />
                  <span className="text-white/25 text-xs font-mono">{order.id}</span>
                  <span className="text-white/25 text-xs">{order.date}</span>
                </div>
                <p className="text-white font-semibold">{order.customer}</p>
                <p className="text-white/40 text-xs">{order.email} · {order.event} · {order.qty}× {order.type}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-display text-yellow-400 text-xl">${order.total}</span>
                <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="Resend ticket email">
                  <Send size={13} />
                </button>
                <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="View QR codes">
                  <QrCode size={13} />
                </button>
                {order.status === "confirmed" && (
                  <button className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer" title="Issue refund">
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-white/30 py-10">No orders found</p>
        )}
      </div>
    </div>
  );
}

function EventsSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">EVENTS</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {MOCK_EVENTS.map(ev => (
          <div key={ev.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={ev.status} />
                </div>
                <h3 className="font-display text-2xl" style={{ color: ev.color }}>{ev.city.toUpperCase()}</h3>
                <p className="text-white/50 text-sm">{ev.date}</p>
                <p className="text-white/40 text-xs">{ev.venue}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-white text-3xl">{ev.sold}</p>
                <p className="text-white/30 text-xs">of {ev.capacity} sold</p>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full" style={{ width: `${(ev.sold / ev.capacity) * 100}%`, background: ev.color }} />
            </div>
            <div className="flex gap-2">
              <Link href={`/events/${ev.city.toLowerCase()}`} target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                <Eye size={12} /> View Page
              </Link>
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                <BarChart2 size={12} /> Analytics
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer">
                <Download size={12} /> Export
              </button>
            </div>
          </div>
        ))}
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
    </div>
  );
}

function CustomersSection() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">CUSTOMERS</h2>
        <p className="text-white/30 text-sm">{MOCK_CUSTOMERS.length} total</p>
      </div>
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-yellow-500/40" />
      </div>
      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-all">
            <div>
              <p className="text-white font-semibold text-sm">{c.name}</p>
              <p className="text-white/40 text-xs">{c.email} · joined {c.joined}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white text-sm font-bold">${c.totalSpent}</p>
                <p className="text-white/30 text-xs">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex gap-1">
                <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="View orders">
                  <Eye size={13} />
                </button>
                <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer" title="Send password reset">
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
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

      <div className="space-y-3">
        {MOCK_COUPONS.map(c => (
          <div key={c.id} className={`flex items-center justify-between bg-white/[0.03] border rounded-2xl px-5 py-4 ${c.active ? "border-white/10" : "border-white/5 opacity-50"}`}>
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-yellow-400 text-base tracking-widest">{c.code}</span>
              <span className="text-white/50 text-sm">
                {c.type === "percentage" ? `${c.value}% off` : `$${c.value} off`}
              </span>
              <span className="text-white/30 text-xs">{c.uses}/{c.maxUses} uses</span>
              <span className="text-white/30 text-xs">expires {c.expires}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-white/10 text-white/30 border-white/20"}`}>
                {c.active ? "Active" : "Inactive"}
              </span>
              <button className="p-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-all cursor-pointer">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckInSection() {
  const [activeEvent, setActiveEvent] = useState(MOCK_EVENTS[0]);
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
        {MOCK_EVENTS.map(ev => (
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
              { label: "Tickets Sold", value: activeEvent.sold, color: "#F5A623" },
              { label: "Checked In", value: 0, color: "#00A878" },
              { label: "Remaining", value: activeEvent.sold, color: "#C8102E" },
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
  const [selected, setSelected] = useState<typeof MOCK_CONTACTS[0] | null>(null);
  const [reply, setReply] = useState("");

  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">SUPPORT INBOX</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          {MOCK_CONTACTS.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left bg-white/[0.03] border rounded-2xl px-4 py-3.5 transition-all cursor-pointer ${selected?.id === c.id ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 hover:border-white/20"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-semibold text-sm">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-white/50 text-xs">{c.subject}</p>
              <p className="text-white/30 text-xs mt-0.5 truncate">{c.message}</p>
            </button>
          ))}
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
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: replace with real admin auth — check against ADMIN_PASSWORD env var via API
    if (password === "tequila2026" || password === "admin") {
      onLogin();
    } else {
      setError("Incorrect password");
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
            <button type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl transition-all cursor-pointer">
              ENTER
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const SECTION_MAP: Record<string, React.ReactNode> = {
    overview:  <OverviewSection />,
    orders:    <OrdersSection />,
    events:    <EventsSection />,
    customers: <CustomersSection />,
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
            <button key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
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
          <button onClick={() => setAuthed(false)}
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
