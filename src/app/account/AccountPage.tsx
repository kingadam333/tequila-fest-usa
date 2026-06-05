"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { User, ShoppingBag, QrCode, LogOut, MapPin, Calendar, Phone, Mail, Edit2, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

// ── Mock data (replace with real API calls) ──────────────────────────────────
const MOCK_USER = {
  firstName: "Adam",
  lastName: "Bossin",
  email: "adam@tequilafestusa.com",
  phone: "(602) 555-0182",
  joinedDate: "June 2026",
};

const MOCK_ORDERS = [
  {
    id: "TF-2026-00124",
    event: "Tequila Fest Cincinnati",
    date: "June 13, 2026",
    venue: "Fountain Square, Cincinnati OH",
    type: "All Inclusive",
    qty: 2,
    total: 110,
    status: "confirmed",
    receiptUrl: "https://pay.stripe.com/receipts/payment/mock-receipt-001",
    tickets: [
      { id: "TKT-CIN-001A", name: "Adam Bossin", type: "All Inclusive" },
      { id: "TKT-CIN-001B", name: "Guest", type: "All Inclusive" },
    ],
  },
  {
    id: "TF-2026-00089",
    event: "Tequila Fest Cleveland",
    date: "July 25, 2026",
    venue: "Cuyahoga County Fairgrounds, Berea OH",
    type: "VIP",
    qty: 1,
    total: 125,
    status: "confirmed",
    receiptUrl: "https://pay.stripe.com/receipts/payment/mock-receipt-002",
    tickets: [
      { id: "TKT-CLE-002A", name: "Adam Bossin", type: "VIP" },
    ],
  },
];

type Tab = "profile" | "orders" | "tickets";

// Simple QR placeholder using SVG pattern
function QRPlaceholder({ value }: { value: string }) {
  return (
    <div className="bg-white p-3 rounded-xl inline-block">
      <div className="w-36 h-36 relative">
        {/* Outer frame */}
        <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 gap-0.5 p-1">
          {Array.from({ length: 49 }).map((_, i) => {
            const row = Math.floor(i / 7);
            const col = i % 7;
            // Corner squares
            const inTopLeft = row < 3 && col < 3;
            const inTopRight = row < 3 && col >= 4;
            const inBottomLeft = row >= 4 && col < 3;
            const isCorner = inTopLeft || inTopRight || inBottomLeft;
            // Pseudo-random fill for data area
            const seed = (value.charCodeAt(i % value.length) + i * 7) % 3;
            const filled = isCorner || (!isCorner && seed === 0);
            return (
              <div key={i} className={`rounded-sm ${filled ? "bg-black" : "bg-white"}`} />
            );
          })}
        </div>
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-1 rounded-md">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-black">TF</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-black text-center text-[9px] font-mono mt-1 tracking-wider">{value}</p>
    </div>
  );
}

function ProfileTab() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(MOCK_USER);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-white text-3xl">PROFILE</h2>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer"
          style={editing
            ? { borderColor: "#22c55e", color: "#22c55e" }
            : { borderColor: "rgba(245,166,35,0.4)", color: "#F5A623" }}
        >
          {editing ? <><Check size={14} /> Save</> : <><Edit2 size={14} /> Edit</>}
        </button>
      </div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/30 border border-green-500/40 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
          ✓ Profile updated successfully
        </motion.div>
      )}

      <div className="space-y-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider mb-1.5 block">First Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                disabled={!editing}
                className="w-full bg-white/[0.08] border border-white/20 disabled:border-white/10 focus:border-yellow-500/60 rounded-xl pl-9 pr-3 py-3 text-white font-medium text-sm outline-none transition-colors duration-200"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider mb-1.5 block">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              disabled={!editing}
              className="w-full bg-white/[0.08] border border-white/20 disabled:border-white/10 focus:border-yellow-500/60 rounded-xl px-4 py-3 text-white font-medium text-sm outline-none transition-colors duration-200"
            />
          </div>
        </div>

        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider mb-1.5 block">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={!editing}
              className="w-full bg-white/[0.08] border border-white/20 disabled:border-white/10 focus:border-yellow-500/60 rounded-xl pl-9 pr-4 py-3 text-white font-medium text-sm outline-none transition-colors duration-200"
            />
          </div>
        </div>

        <div>
          <label className="text-white text-xs font-bold uppercase tracking-wider mb-1.5 block">Phone</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              disabled={!editing}
              className="w-full bg-white/[0.08] border border-white/20 disabled:border-white/10 focus:border-yellow-500/60 rounded-xl pl-9 pr-4 py-3 text-white font-medium text-sm outline-none transition-colors duration-200"
            />
          </div>
        </div>

        <div className="pt-1">
          <p className="text-white/60 text-sm font-medium">Member since <span className="text-white">{MOCK_USER.joinedDate}</span></p>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-white/10">
        <h3 className="text-white font-bold text-sm mb-4">Password</h3>
        <button className="text-sm text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/60 px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer font-semibold">
          Change Password
        </button>
      </div>
    </div>
  );
}

function OrdersTab({ onViewTickets }: { onViewTickets: (orderId: string) => void }) {
  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">ORDER HISTORY</h2>
      {MOCK_ORDERS.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <ShoppingBag size={40} className="mx-auto mb-4 opacity-30" />
          <p>No orders yet.</p>
          <Link href="/#events" className="mt-4 inline-block text-yellow-400 text-sm hover:underline">Browse Events →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_ORDERS.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-yellow-500/20 transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-green-900/40 border border-green-500/30 text-green-400 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {order.status}
                    </span>
                    <span className="text-white/25 text-xs">{order.id}</span>
                  </div>
                  <h3 className="font-display text-yellow-400 text-xl">{order.event}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="flex items-center gap-1.5 text-white/50 text-sm">
                      <Calendar size={13} /> {order.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/50 text-sm">
                      <MapPin size={13} /> {order.venue}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-1">
                    {order.qty}× {order.type} · <span className="text-white/60 font-semibold">${order.total}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => onViewTickets(order.id)}
                    className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    <QrCode size={15} />
                    View Tickets
                  </button>
                  <a
                    href={order.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white/60 hover:text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    View Receipt
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "All Inclusive": { bg: "bg-yellow-500/20",   text: "text-yellow-400",   border: "border-yellow-500/40",   label: "ALL INCLUSIVE" },
  "VIP":           { bg: "bg-[#C0C0C0]/15",    text: "text-[#E8E8E8]",   border: "border-[#C0C0C0]/30",    label: "VIP" },
  "GA Entry":      { bg: "bg-white/10",         text: "text-white/70",    border: "border-white/20",         label: "GA ENTRY" },
};

function TicketsTab({ highlightOrderId }: { highlightOrderId?: string }) {
  const allTickets = MOCK_ORDERS.flatMap(order =>
    order.tickets.map(t => ({ ...t, event: order.event, date: order.date, orderId: order.id }))
  );

  // checkedIn state: ticketId → timestamp string
  const [checkedIn, setCheckedIn] = useState<Record<string, string>>({});

  const handleSimulateCheckin = (ticketId: string) => {
    const now = new Date();
    const ts = now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    setCheckedIn(prev => ({ ...prev, [ticketId]: ts }));
  };

  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-2">MY TICKETS</h2>
      <p className="text-white/40 text-sm mb-8">Show this QR code at the door — one scan per entry.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {allTickets.map(ticket => {
          const isCheckedIn = !!checkedIn[ticket.id];
          const typeStyle = TYPE_STYLES[ticket.type] || TYPE_STYLES["GA Entry"];

          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
                isCheckedIn
                  ? "border-red-500/60 shadow-[0_0_30px_rgba(200,16,46,0.2)]"
                  : highlightOrderId === ticket.orderId
                    ? "border-yellow-500/50 shadow-[0_0_30px_rgba(245,166,35,0.15)]"
                    : "border-white/10"
              }`}
            >
              {/* Ticket header — red when checked in */}
              <div className={`px-5 py-4 border-b transition-colors duration-500 ${
                isCheckedIn
                  ? "bg-gradient-to-r from-red-900/70 to-red-950/80 border-red-500/30"
                  : "bg-gradient-to-r from-yellow-900/40 to-orange-950/40 border-white/10"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-yellow-400 text-lg leading-tight">{ticket.event}</p>
                    <p className="text-white/50 text-xs mt-0.5">{ticket.date}</p>
                  </div>
                  {isCheckedIn && (
                    <span className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
                      ✓ CHECKED IN
                    </span>
                  )}
                </div>
              </div>

              {/* Ticket type — big and prominent */}
              <div className={`px-5 pt-4 pb-2 transition-colors duration-500 ${isCheckedIn ? "bg-red-950/40" : "bg-black/20"}`}>
                <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border ${typeStyle.bg} ${typeStyle.border}`}>
                  <span className={`font-display text-2xl tracking-wide ${typeStyle.text}`}>{typeStyle.label}</span>
                </div>
              </div>

              {/* Ticket body */}
              <div className={`px-5 py-4 flex items-start gap-5 transition-colors duration-500 ${isCheckedIn ? "bg-red-950/30" : "bg-black/30"}`}>
                {/* QR — greyed out if checked in */}
                <div className={`flex-shrink-0 transition-opacity duration-500 ${isCheckedIn ? "opacity-30 grayscale" : ""}`}>
                  <QRPlaceholder value={ticket.id} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Ticket Holder</p>
                  <p className="text-white font-bold text-base truncate">{ticket.name}</p>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-xs">Ticket ID</span>
                      <span className="text-white/60 text-xs font-mono">{ticket.id}</span>
                    </div>
                    {isCheckedIn && (
                      <div className="flex items-center justify-between">
                        <span className="text-red-400/70 text-xs font-semibold">Checked In</span>
                        <span className="text-red-300 text-xs font-bold">{checkedIn[ticket.id]}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 text-xs text-white/40 hover:text-white/60 border border-white/10 hover:border-white/20 py-2 rounded-lg transition-all duration-200 cursor-pointer">
                      Download PDF
                    </button>
                    {/* Dev/demo only — remove in prod */}
                    {!isCheckedIn && (
                      <button
                        onClick={() => handleSimulateCheckin(ticket.id)}
                        className="text-xs text-white/20 hover:text-red-400/60 border border-white/5 hover:border-red-500/20 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Simulate check-in (demo)"
                      >
                        Scan
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dashed separator */}
              <div className={`px-5 flex items-center gap-2 transition-colors duration-500 ${isCheckedIn ? "bg-red-950/30" : ""}`}>
                <div className="w-4 h-4 rounded-full bg-[#0d0500] -ml-7 flex-shrink-0" />
                <div className={`flex-1 border-t border-dashed ${isCheckedIn ? "border-red-500/20" : "border-white/10"}`} />
                <div className="w-4 h-4 rounded-full bg-[#0d0500] -mr-7 flex-shrink-0" />
              </div>

              {/* Footer */}
              <div className={`px-5 py-3 flex items-center justify-between transition-colors duration-500 ${isCheckedIn ? "bg-red-950/40" : "bg-black/20"}`}>
                <span className={`text-xs ${isCheckedIn ? "text-red-400/50" : "text-white/20"}`}>Must be 21+</span>
                <span className={`text-xs ${isCheckedIn ? "text-red-400/50" : "text-white/20"}`}>TequilaFestUSA.com</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [highlightOrder, setHighlightOrder] = useState<string | undefined>();

  const handleViewTickets = (orderId: string) => {
    setHighlightOrder(orderId);
    setTab("tickets");
  };

  const tabs = [
    { id: "profile" as Tab, label: "Profile", icon: <User size={16} /> },
    { id: "orders" as Tab, label: "Orders", icon: <ShoppingBag size={16} /> },
    { id: "tickets" as Tab, label: "My Tickets", icon: <QrCode size={16} /> },
  ];

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.05) 0%, transparent 50%)" }}
        />

        <div className="max-w-5xl mx-auto px-4 py-12 relative">

          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                <span className="font-display text-yellow-400 text-2xl">
                  {MOCK_USER.firstName[0]}{MOCK_USER.lastName[0]}
                </span>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Welcome back</p>
                <h1 className="font-display text-white text-2xl leading-tight">
                  {MOCK_USER.firstName.toUpperCase()} {MOCK_USER.lastName.toUpperCase()}
                </h1>
              </div>
            </div>
            <button className="hidden sm:flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors duration-200 cursor-pointer">
              <LogOut size={15} />
              Log Out
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1 mb-8 w-fit">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${tab === t.id ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white/70"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "profile" && <ProfileTab />}
              {tab === "orders" && <OrdersTab onViewTickets={handleViewTickets} />}
              {tab === "tickets" && <TicketsTab highlightOrderId={highlightOrder} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </>
  );
}
