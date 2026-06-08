"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { User, ShoppingBag, QrCode, LogOut, MapPin, Calendar, Phone, Mail, Edit2, Check, LayoutDashboard, Gift, Copy, Send, Trophy } from "lucide-react";
import QRCode from "qrcode";
import DashboardTab from "./DashboardTab";
import { TICKET_LABELS } from "@/lib/ticket-config";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  loyaltyPoints: number;
}

interface RealOrder {
  id: string;
  order_number: string;
  event_slug: string;
  event_city: string;
  customer_name: string;
  ticket_type: string;
  quantity: number;
  total: number;
  status: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  ticket_instances: { id: string; qr_code: string; ticket_number: number; status: string; holder_name: string; ticket_type: string }[];
}

type Tab = "dashboard" | "profile" | "orders" | "tickets" | "refer";

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

function ProfileTab({ user }: { user: AuthUser }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    joinedDate: "",
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }),
      });
      if (res.ok) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json();
        setSaveError(d.error || "Failed to save. Please try again.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
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
          {editing ? <><Check size={14} /> {saving ? "Saving..." : "Save"}</> : <><Edit2 size={14} /> Edit</>}
        </button>
      </div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/30 border border-green-500/40 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
          ✓ Profile updated successfully
        </motion.div>
      )}

      {saveError && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {saveError}
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
          <p className="text-white/60 text-sm font-medium">Member since <span className="text-white">{form.joinedDate || "2026"}</span></p>
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

function OrdersTab({ onViewTickets, orders }: { onViewTickets: (orderId: string) => void; orders: RealOrder[] }) {
  return (
    <div>
      <h2 className="font-display text-white text-3xl mb-6">ORDER HISTORY</h2>
      {orders.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <ShoppingBag size={40} className="mx-auto mb-4 opacity-30" />
          <p>No orders yet.</p>
          <Link href="/#events" className="mt-4 inline-block text-yellow-400 text-sm hover:underline">Browse Events →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
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
                    <span className="text-white/25 text-xs">{order.order_number}</span>
                  </div>
                  <h3 className="font-display text-yellow-400 text-xl">Tequila Fest {order.event_city}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="flex items-center gap-1.5 text-white/50 text-sm">
                      <Calendar size={13} /> {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mt-1">
                    {order.quantity}× {order.ticket_type} · <span className="text-white/60 font-semibold">${Number(order.total).toFixed(2)}</span>
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
                  {order.stripe_payment_intent_id && (
                  <a
                    href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white/60 hover:text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    View Receipt
                  </a>
                  )}
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
  "All Inclusive":    { bg: "bg-yellow-500/20", text: "text-yellow-400",  border: "border-yellow-500/40", label: "ALL INCLUSIVE" },
  "Early Bird":       { bg: "bg-yellow-500/20", text: "text-yellow-400",  border: "border-yellow-500/40", label: "EARLY BIRD" },
  "Regular Rate":     { bg: "bg-yellow-500/20", text: "text-yellow-400",  border: "border-yellow-500/40", label: "REGULAR RATE" },
  "Late Registration":{ bg: "bg-orange-500/20", text: "text-orange-400",  border: "border-orange-500/40", label: "LATE REGISTRATION" },
  "VIP Experience":   { bg: "bg-[#C0C0C0]/15",  text: "text-[#E8E8E8]",  border: "border-[#C0C0C0]/30",  label: "VIP EXPERIENCE" },
  "VIP":              { bg: "bg-[#C0C0C0]/15",  text: "text-[#E8E8E8]",  border: "border-[#C0C0C0]/30",  label: "VIP" },
  "GA Entry":         { bg: "bg-white/10",       text: "text-white/70",   border: "border-white/20",      label: "GA ENTRY" },
};

// Normalize raw DB ticket type keys (e.g. "regular") to display labels (e.g. "Regular Rate")
function normalizeTicketType(raw: string): string {
  return (TICKET_LABELS as Record<string, string>)[raw] ?? raw;
}

function TicketsTab({ highlightOrderId, orders }: { highlightOrderId?: string; orders: RealOrder[] }) {
  const allTickets = orders.flatMap(order =>
    (order.ticket_instances || []).map((t, idx) => ({
      id: t.qr_code,
      name: t.holder_name,
      type: normalizeTicketType(t.ticket_type || order.ticket_type || ""),
      event: `Tequila Fest ${order.event_city}`,
      date: new Date(order.created_at).toLocaleDateString(),
      orderId: order.id,
      ticketNumber: idx + 1,
      totalInOrder: order.ticket_instances?.length || order.quantity,
      status: t.status,
    }))
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
                    <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mb-0.5">
                      Ticket #{ticket.ticketNumber}
                      {ticket.totalInOrder > 1 && (
                        <span className="text-white/25 font-normal"> of {ticket.totalInOrder}</span>
                      )}
                    </p>
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

              {/* Ticket body */}
              <div className={`px-5 py-4 flex items-start gap-5 transition-colors duration-500 ${isCheckedIn ? "bg-red-950/30" : "bg-black/30"}`}>
                {/* QR — greyed out if checked in */}
                <div className={`flex-shrink-0 transition-opacity duration-500 ${isCheckedIn ? "opacity-30 grayscale" : ""}`}>
                  <QRPlaceholder value={ticket.id} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  {/* Ticket holder */}
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">Ticket Holder</p>
                    <p className="text-white font-bold text-base truncate">{ticket.name}</p>
                  </div>

                  {/* Ticket type — big, right below holder */}
                  {ticket.type === "VIP" || ticket.type === "VIP Experience" ? (
                    <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 w-fit"
                      style={{
                        background: "linear-gradient(135deg, rgba(192,192,192,0.15), rgba(80,80,80,0.1))",
                        border: "1px solid rgba(192,192,192,0.35)",
                        boxShadow: "0 0 12px rgba(192,192,192,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                      }}>
                      <span className="font-display text-2xl tracking-wide text-shimmer-platinum">VIP</span>
                    </div>
                  ) : (
                    <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border w-fit ${typeStyle.bg} ${typeStyle.border}`}>
                      <span className={`font-display text-2xl tracking-wide ${typeStyle.text}`}>{typeStyle.label}</span>
                    </div>
                  )}

                  {/* Ticket ID */}
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Ticket ID</p>
                    <p className="text-white/60 text-xs font-mono">{ticket.id}</p>
                  </div>

                  {/* Check-in timestamp */}
                  {isCheckedIn && (
                    <div>
                      <p className="text-red-400/70 text-xs font-semibold uppercase tracking-wider mb-0.5">Checked In</p>
                      <p className="text-red-300 text-xs font-bold">{checkedIn[ticket.id]}</p>
                    </div>
                  )}

                  {/* Download PDF */}
                  <div className="flex gap-2 mt-1">
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

function ReferTab({ orders, userName }: { orders: RealOrder[]; userName: string }) {
  // Deduplicate events the user has bought tickets for
  const userEvents = Array.from(
    new Map(
      orders.filter(o => o.event_slug && o.status === "paid").map(o => [o.event_slug, { slug: o.event_slug, city: o.event_city }])
    ).values()
  );

  const [selectedSlug, setSelectedSlug] = useState(userEvents[0]?.slug || "");
  const [refData, setRefData] = useState<{ code: string; referralUrl: string; stats: { totalReferrals: number; pendingReferrals: number; pointsEarned: number; raffleEntries: number }; event: { city: string; date: string } | null } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    fetch(`/api/referral?event_slug=${selectedSlug}`)
      .then(r => r.json())
      .then(async data => {
        setRefData(data);
        if (data.referralUrl) {
          const qr = await QRCode.toDataURL(data.referralUrl, { width: 200, margin: 2, color: { dark: "#F5A623", light: "#0d0500" } });
          setQrDataUrl(qr);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSlug]);

  const copyLink = () => {
    if (!refData?.referralUrl) return;
    navigator.clipboard.writeText(refData.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvites = async () => {
    const emails = inviteEmails.split(/[\s,]+/).map(e => e.trim()).filter(e => e.includes("@"));
    if (!emails.length || !refData) return;
    setSending(true);
    await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_slug: selectedSlug,
        invitee_emails: emails,
        referral_code: refData.code,
        referrer_name: userName || orders[0]?.customer_name?.split(" ")[0] || "A friend",
      }),
    });
    setSending(false);
    setSendSuccess(true);
    setInviteEmails("");
    setTimeout(() => setSendSuccess(false), 4000);
  };

  if (userEvents.length === 0) {
    return (
      <div className="text-center py-16">
        <Gift size={40} className="mx-auto text-white/20 mb-4" />
        <p className="font-display text-white text-2xl mb-2">REFER A FRIEND</p>
        <p className="text-white/40 text-sm">Purchase a ticket first to get your referral link.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-white text-3xl mb-1">REFER A FRIEND</h2>
        <p className="text-white/40 text-sm">Earn 5 points + 1 raffle entry for every friend who buys a ticket. Win a VIP upgrade!</p>
      </div>

      {/* Raffle banner */}
      <div className="rounded-2xl p-5 border border-yellow-500/30" style={{ background: "linear-gradient(135deg, rgba(123,47,190,0.3), rgba(200,16,46,0.2))" }}>
        <div className="flex items-start gap-4">
          <Trophy size={28} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-display text-yellow-400 text-xl tracking-wide">VIP UPGRADE RAFFLE</p>
            <p className="text-white/70 text-sm mt-1 leading-relaxed">Every referral = 5 points + 1 raffle entry. The more friends you bring, the more chances to win a free VIP upgrade for your next Tequila Fest!</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {refData && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Referrals", value: refData.stats.totalReferrals, color: "#F5A623" },
            { label: "Points Earned", value: refData.stats.pointsEarned, color: "#00A878" },
            { label: "Raffle Entries", value: refData.stats.raffleEntries, color: "#7B2FBE" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
              <p className="font-display text-3xl" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Event selector (if multiple) */}
      {userEvents.length > 1 && (
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Your Event</p>
          <div className="flex gap-2 flex-wrap">
            {userEvents.map(ev => (
              <button key={ev.slug} onClick={() => setSelectedSlug(ev.slug)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${selectedSlug === ev.slug ? "bg-yellow-500 text-black border-yellow-500" : "bg-white/5 border-white/15 text-white/60 hover:text-white"}`}>
                {ev.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
      ) : refData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: link + QR */}
          <div className="space-y-5">
            {/* Referral link */}
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Your Referral Link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-yellow-400 text-sm font-mono truncate">
                  {refData.referralUrl}
                </div>
                <button onClick={copyLink}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl text-sm transition-all cursor-pointer flex-shrink-0">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Share QR Code</p>
                <div className="bg-[#0d0500] border border-white/10 rounded-2xl p-4 inline-block">
                  <img src={qrDataUrl} alt="Referral QR Code" className="w-36 h-36" />
                </div>
                <p className="text-white/30 text-xs mt-2">Screenshot and share anywhere</p>
              </div>
            )}
          </div>

          {/* Right: email invite */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Send Email Invites</p>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
              <textarea
                value={inviteEmails}
                onChange={e => setInviteEmails(e.target.value)}
                placeholder="Enter email addresses, separated by commas or spaces"
                rows={4}
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none resize-none transition-colors"
              />
              <button onClick={sendInvites} disabled={sending || !inviteEmails.trim()}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-all cursor-pointer">
                <Send size={15} />
                {sending ? "Sending..." : "Send Invites"}
              </button>
              {sendSuccess && (
                <p className="text-green-400 text-sm text-center flex items-center justify-center gap-2">
                  <Check size={14} /> Invites sent! You&apos;ll earn points when they buy.
                </p>
              )}
              <p className="text-white/30 text-xs text-center">Up to 10 invites per send</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [highlightOrder, setHighlightOrder] = useState<string | undefined>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Get session
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionData.user) {
        window.location.href = "/login";
        return;
      }
      setUser(sessionData.user);

      // Get orders + tickets from Supabase
      const ordersRes = await fetch(`/api/account/orders`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
      setLoadingData(false);
    };
    load();
  }, []);

  const handleViewTickets = (orderId: string) => {
    setHighlightOrder(orderId);
    setTab("tickets");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const ticketCount = orders.reduce((s, o) => s + (o.ticket_instances?.length || o.quantity), 0);

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "orders" as Tab, label: "Orders", icon: <ShoppingBag size={16} /> },
    { id: "tickets" as Tab, label: "My Tickets", icon: <QrCode size={16} /> },
    { id: "refer" as Tab, label: "Refer a Friend", icon: <Gift size={16} /> },
    { id: "profile" as Tab, label: "Profile", icon: <User size={16} /> },
  ];

  if (loadingData || !user) return (
    <div className="min-h-screen bg-[#0d0500] flex items-center justify-center">
      <div className="text-white/30 text-sm">Loading your account...</div>
    </div>
  );

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
                  {(user.firstName?.[0] || "?")}{(user.lastName?.[0] || "")}
                </span>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Welcome back</p>
                <h1 className="font-display text-white text-2xl leading-tight">
                  {user.firstName.toUpperCase()} {user.lastName.toUpperCase()}
                </h1>
              </div>
            </div>
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors duration-200 cursor-pointer">
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
              {tab === "dashboard" && <DashboardTab firstName={user.firstName} loyaltyPoints={user.loyaltyPoints} ticketCount={ticketCount} onGoToTickets={() => setTab("tickets")} />}
              {tab === "profile" && <ProfileTab user={user} />}
              {tab === "orders" && <OrdersTab onViewTickets={handleViewTickets} orders={orders} />}
              {tab === "tickets" && <TicketsTab highlightOrderId={highlightOrder} orders={orders} />}
              {tab === "refer" && <ReferTab orders={orders} userName={user.firstName} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </>
  );
}
