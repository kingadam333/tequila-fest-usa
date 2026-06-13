"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, QrCode, CheckCircle, XCircle, AlertCircle, ChevronDown, RotateCcw, Users, LogOut, X, Zap } from "lucide-react";

const EVENTS = [
  { slug: "cincinnati", label: "Cincinnati — Jun 13" },
  { slug: "cleveland",  label: "Cleveland — Jul 25" },
  { slug: "columbus",   label: "Columbus — Aug 8" },
  { slug: "phoenix",    label: "Phoenix — Nov 14" },
];

const TYPE_COLORS: Record<string, string> = {
  "vip":               "#C0C0C0",
  "VIP Experience":    "#C0C0C0",
  "all_inclusive":     "#F5A623",
  "All Inclusive":     "#F5A623",
  "Early Bird":        "#F5A623",
  "Regular Rate":      "#F5A623",
  "Late Registration": "#F5A623",
  "ga":                "#60a5fa",
  "GA":                "#60a5fa",
};

interface TicketResult {
  id: string;
  ticket_number: number;
  ticket_type: string;
  holder_name: string;
  qr_code: string;
  status: string;
  checked_in_at: string | null;
  event_city: string;
  event_slug: string;
  order_id: string;
  ticket_orders: {
    order_number: string;
    customer_email: string;
    customer_name: string;
    quantity: number;
  };
}

interface OrderTicket {
  id: string;
  ticket_number: number;
  ticket_type: string;
  status: string;
  checked_in_at: string | null;
  holder_name: string;
}

interface Stats {
  total: number;
  checkedIn: number;
  byType: Record<string, { total: number; checkedIn: number }>;
}

export default function CheckinPortal() {
  const [token, setToken] = useState("");
  const [staffName, setStaffName] = useState("");
  const [loginMode, setLoginMode] = useState<"staff" | "admin">("staff");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [adminPwInput, setAdminPwInput] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].slug);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<TicketResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketResult | null>(null);
  const [orderTickets, setOrderTickets] = useState<OrderTicket[]>([]);
  const [confirmStatus, setConfirmStatus] = useState<"idle" | "success" | "already" | "error">("idle");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const scannerRef = useRef<any>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const loginAsStaff = async () => {
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    setTokenError("");
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        const t = `Bearer ${data.token}`;
        localStorage.setItem("staff_token", t);
        setToken(t);
        setStaffName(data.staff.name);
      } else {
        setTokenError(data.error || "Invalid email or password");
      }
    } catch {
      setTokenError("Network error — try again");
    } finally {
      setLoginLoading(false);
    }
  };

  const loginAsAdmin = () => {
    if (!adminPwInput.trim()) return;
    setToken(adminPwInput.trim());
    setStaffName("Admin");
    setTokenError("");
  };

  // ── Auto-login from localStorage ─────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("staff_token");
    if (stored && !token) setToken(stored);
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async (t: string, ev: string) => {
    const res = await fetch(`/api/checkin/stats?event=${ev}`, {
      headers: { "x-checkin-token": t },
    });
    if (res.ok) setStats(await res.json());
    else if (res.status === 401) { setToken(""); localStorage.removeItem("staff_token"); setTokenError("Session expired"); }
  }, []);

  useEffect(() => {
    if (token) loadStats(token, selectedEvent);
  }, [token, selectedEvent, loadStats]);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string): Promise<TicketResult[]> => {
    if (!q.trim()) { setResults([]); return []; }
    setSearching(true);
    const res = await fetch(`/api/checkin/lookup?q=${encodeURIComponent(q)}&event=${selectedEvent}`, {
      headers: { "x-checkin-token": token },
    });
    if (res.ok) {
      const data = await res.json();
      const r = data.results || [];
      setResults(r);
      if (data.orderTickets) setOrderTickets(data.orderTickets);
      setSearching(false);
      return r;
    }
    setSearching(false);
    return [];
  }, [token, selectedEvent]);

  const onSearchChange = (val: string) => {
    setSearchQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 300);
  };

  // ── Check In (core) ───────────────────────────────────────────────────────
  const doCheckIn = useCallback(async (ticket: TicketResult, undo = false) => {
    const res = await fetch("/api/checkin/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-checkin-token": token },
      body: JSON.stringify({ ticketId: ticket.id, undo }),
    });
    const data = await res.json();

    if (undo) {
      setActiveTicket(t => t ? { ...t, status: "valid", checked_in_at: null } : t);
      setOrderTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "valid", checked_in_at: null } : t));
      setConfirmStatus("success");
      setConfirmMsg("Check-in undone");
      loadStats(token, selectedEvent);
      return;
    }

    if (data.alreadyCheckedIn) {
      setConfirmStatus("already");
      const time = new Date(data.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConfirmMsg(`Already checked in at ${time}`);
    } else if (data.success) {
      const now = new Date().toISOString();
      setActiveTicket(t => t ? { ...t, status: "checked_in", checked_in_at: now } : t);
      setOrderTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "checked_in", checked_in_at: now } : t));
      setConfirmStatus("success");
      setConfirmMsg("✓ Checked in!");
      loadStats(token, selectedEvent);
      if (searchQ) doSearch(searchQ);
    } else {
      setConfirmStatus("error");
      setConfirmMsg("Error — try again");
    }
    setTimeout(() => setConfirmStatus("idle"), 4000);
  }, [token, selectedEvent, searchQ, loadStats, doSearch]);

  // ── QR Scanner (fullscreen overlay) ──────────────────────────────────────
  const startScanner = async () => {
    setScanMode(true);
    setScannerReady(false);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader-fullscreen");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 260, height: 260 } },
        async (decodedText: string) => {
          // Flash feedback
          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 300);

          // Stop scanner immediately
          try { await scanner.stop(); } catch {}
          scannerRef.current = null;
          setScanMode(false);

          // Look up the ticket
          const found = await doSearch(decodedText);
          if (found.length > 0) {
            const ticket = found[0];
            setActiveTicket(ticket);
            setSearchQ(decodedText);
            // Auto check-in immediately
            if (ticket.status !== "checked_in") {
              await doCheckIn(ticket);
            } else {
              setConfirmStatus("already");
              const time = new Date(ticket.checked_in_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              setConfirmMsg(`Already checked in at ${time}`);
              setTimeout(() => setConfirmStatus("idle"), 4000);
            }
          } else {
            setConfirmStatus("error");
            setConfirmMsg("Ticket not found");
            setTimeout(() => setConfirmStatus("idle"), 4000);
          }
        },
        () => {}
      );
      setScannerReady(true);
    } catch {
      setScanMode(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanMode(false);
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="font-display text-yellow-400 text-2xl tracking-widest mb-1">TEQUILA FEST USA</p>
            <p className="text-white/30 text-sm">Door Staff Check-In</p>
          </div>
          <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-4">
            {(["staff", "admin"] as const).map(mode => (
              <button key={mode} onClick={() => { setLoginMode(mode); setTokenError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${loginMode === mode ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white/60"}`}>
                {mode === "staff" ? "Staff Login" : "Admin"}
              </button>
            ))}
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
            {tokenError && <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2">{tokenError}</p>}
            {loginMode === "staff" ? (
              <>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsStaff()} placeholder="your@email.com" autoFocus
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Password</label>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsStaff()} placeholder="Your password"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <button onClick={loginAsStaff} disabled={loginLoading || !loginEmail || !loginPassword}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all cursor-pointer">
                  {loginLoading ? "Signing in..." : "SIGN IN"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Admin Password</label>
                  <input type="password" value={adminPwInput} onChange={e => setAdminPwInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsAdmin()} placeholder="Admin password" autoFocus
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <button onClick={loginAsAdmin} disabled={!adminPwInput}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all cursor-pointer">
                  ENTER
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main portal ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── Fullscreen QR Scanner Overlay ── */}
      <AnimatePresence>
        {scanMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Flash on scan */}
            {scanFlash && <div className="absolute inset-0 bg-white/30 z-10 pointer-events-none" />}

            {/* Camera feed */}
            <div className="flex-1 relative">
              <div id="qr-reader-fullscreen" className="w-full h-full" />

              {/* Viewfinder overlay */}
              {scannerReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Dark corners */}
                  <div className="absolute inset-0 bg-black/50" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 calc(50% - 130px), calc(50% - 130px) calc(50% - 130px), calc(50% - 130px) calc(50% + 130px), calc(50% + 130px) calc(50% + 130px), calc(50% + 130px) calc(50% - 130px), 0 calc(50% - 130px))" }} />
                  {/* Gold corner marks */}
                  <div className="relative w-[260px] h-[260px]">
                    {[["top-0 left-0", "border-t-2 border-l-2"], ["top-0 right-0", "border-t-2 border-r-2"], ["bottom-0 left-0", "border-b-2 border-l-2"], ["bottom-0 right-0", "border-b-2 border-r-2"]].map(([pos, border]) => (
                      <div key={pos} className={`absolute ${pos} w-8 h-8 border-yellow-400 ${border}`} />
                    ))}
                  </div>
                </div>
              )}

              {!scannerReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/50 text-sm">Starting camera...</p>
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div className="px-6 py-8 flex flex-col items-center gap-4">
              <p className="text-white/60 text-sm">Point at a ticket QR code — auto check-in on scan</p>
              <button onClick={stopScanner}
                className="flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all active:scale-95 cursor-pointer">
                <X size={18} /> Close Scanner
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-black/60 border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div>
          <p className="font-display text-yellow-400 text-sm tracking-widest">TEQUILA FEST</p>
          <p className="text-white/30 text-xs">{staffName ? `Hi, ${staffName}` : "Check-In Portal"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={selectedEvent}
              onChange={e => { setSelectedEvent(e.target.value); setResults([]); setSearchQ(""); setActiveTicket(null); }}
              className="appearance-none bg-white/10 border border-white/20 rounded-lg pl-3 pr-8 py-1.5 text-white text-xs outline-none cursor-pointer">
              {EVENTS.map(ev => <option key={ev.slug} value={ev.slug} className="bg-[#0a0a0a]">{ev.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
          <button onClick={() => { setToken(""); localStorage.removeItem("staff_token"); }}
            className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-yellow-400 text-2xl">{stats.checkedIn}</p>
              <p className="text-white/30 text-xs mt-0.5">Checked In</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-white text-2xl">{stats.total}</p>
              <p className="text-white/30 text-xs mt-0.5">Total</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-green-400 text-2xl">
                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
              </p>
              <p className="text-white/30 text-xs mt-0.5">Arrived</p>
            </div>
          </div>
        )}

        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 space-y-2">
            {Object.entries(stats.byType).map(([type, counts]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[type] || "#F5A623" }} />
                <span className="text-white/50 text-xs flex-1 capitalize">{type}</span>
                <span className="text-white/70 text-xs tabular-nums">{counts.checkedIn}/{counts.total}</span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${counts.total > 0 ? (counts.checkedIn / counts.total) * 100 : 0}%`, background: TYPE_COLORS[type] || "#F5A623" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Scan button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={searchQ} onChange={e => onSearchChange(e.target.value)}
              placeholder="Name, email, or order #..."
              className="w-full bg-white/[0.06] border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 outline-none text-sm" />
            {searching && (
              <svg className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
          </div>
          <button onClick={startScanner}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-400 text-black transition-all active:scale-95 cursor-pointer">
            <QrCode size={18} />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Confirm toast */}
        <AnimatePresence>
          {confirmStatus !== "idle" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                confirmStatus === "success" ? "bg-green-500/20 border border-green-500/40 text-green-400" :
                confirmStatus === "already" ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400" :
                "bg-red-500/20 border border-red-500/40 text-red-400"
              }`}>
              {confirmStatus === "success" ? <CheckCircle size={18} /> :
               confirmStatus === "already" ? <AlertCircle size={18} /> : <XCircle size={18} />}
              {confirmMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active ticket detail */}
        <AnimatePresence>
          {activeTicket && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`border rounded-2xl overflow-hidden ${
                activeTicket.status === "checked_in" ? "bg-green-950/30 border-green-500/40" : "bg-white/[0.04] border-white/15"
              }`}>

              {/* Name / close */}
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div>
                  <p className="text-white font-bold text-xl leading-tight">
                    {activeTicket.ticket_orders?.customer_name || activeTicket.holder_name}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{activeTicket.ticket_orders?.customer_email}</p>
                </div>
                <button onClick={() => { setActiveTicket(null); setOrderTickets([]); setConfirmStatus("idle"); }}
                  className="text-white/20 hover:text-white/50 transition-colors cursor-pointer p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Ticket detail grid */}
              <div className="grid grid-cols-2 gap-2 px-5 pb-3">
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Ticket Type</p>
                  <p className="font-bold text-sm" style={{ color: TYPE_COLORS[activeTicket.ticket_type] || "#F5A623" }}>
                    {activeTicket.ticket_type}
                  </p>
                </div>
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Order</p>
                  <p className="text-white/70 text-sm font-mono">{activeTicket.ticket_orders?.order_number}</p>
                </div>
              </div>

              {/* ── Order ticket progress ── */}
              {orderTickets.length > 0 && (
                <div className="mx-5 mb-4 bg-white/[0.04] border border-white/10 rounded-xl p-3">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>All Tickets in this Order</span>
                    <span className="text-white/50">
                      {orderTickets.filter(t => t.status === "checked_in").length} / {orderTickets.length} checked in
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    {orderTickets.map(t => (
                      <div key={t.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        t.id === activeTicket.id ? "bg-white/10 border border-white/15" : "bg-white/[0.02]"
                      }`}>
                        <div className="flex items-center gap-2">
                          {t.status === "checked_in"
                            ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                            : <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                          }
                          <span className="text-white/70 text-xs capitalize">{t.ticket_type} #{t.ticket_number}</span>
                          {t.id === activeTicket.id && <span className="text-yellow-400 text-[10px] font-bold">← this one</span>}
                        </div>
                        <div className="text-right">
                          {t.status === "checked_in"
                            ? <span className="text-green-400 text-xs">{t.checked_in_at ? new Date(t.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In"}</span>
                            : <span className="text-white/25 text-xs">Remaining</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTicket.checked_in_at && (
                <p className="text-white/25 text-xs text-center pb-3">
                  Checked in at {new Date(activeTicket.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

              {/* Action button */}
              <div className="px-5 pb-5 flex gap-2">
                {activeTicket.status !== "checked_in" ? (
                  <button onClick={() => doCheckIn(activeTicket)}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-base flex items-center justify-center gap-2">
                    <CheckCircle size={20} /> CHECK IN
                  </button>
                ) : (
                  <button onClick={() => doCheckIn(activeTicket, true)}
                    className="flex-1 bg-white/10 hover:bg-white/15 border border-white/15 text-white/60 font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm flex items-center justify-center gap-2">
                    <RotateCcw size={14} /> Undo Check-In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search results */}
        {results.length > 0 && !activeTicket && (
          <div className="space-y-2">
            <p className="text-white/30 text-xs uppercase tracking-wider px-1">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map(ticket => (
              <motion.button key={ticket.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                onClick={async () => {
                  setActiveTicket(ticket);
                  setConfirmStatus("idle");
                  // Load order siblings
                  const res = await fetch(`/api/checkin/lookup?q=${encodeURIComponent(ticket.qr_code)}&event=${selectedEvent}`, {
                    headers: { "x-checkin-token": token },
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.orderTickets) setOrderTickets(data.orderTickets);
                  }
                }}
                className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all cursor-pointer hover:border-white/25 ${
                  ticket.status === "checked_in" ? "bg-green-950/20 border-green-500/30" : "bg-white/[0.03] border-white/10"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {ticket.ticket_orders?.customer_name || ticket.holder_name}
                    </p>
                    <p className="text-white/35 text-xs truncate mt-0.5">{ticket.ticket_orders?.customer_email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className="text-xs font-semibold capitalize" style={{ color: TYPE_COLORS[ticket.ticket_type] || "#F5A623" }}>
                      {ticket.ticket_type}
                    </span>
                    {ticket.status === "checked_in"
                      ? <span className="text-green-400 text-[10px] flex items-center gap-0.5"><CheckCircle size={10} /> In</span>
                      : <span className="text-white/20 text-[10px]">Ticket #{ticket.ticket_number}</span>
                    }
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Empty / idle states */}
        {searchQ && !searching && results.length === 0 && !activeTicket && (
          <div className="text-center py-10">
            <Users size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No tickets found for &ldquo;{searchQ}&rdquo;</p>
            <p className="text-white/15 text-xs mt-1">Try name, email, or order number</p>
          </div>
        )}
        {!searchQ && results.length === 0 && !activeTicket && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-yellow-400" />
            </div>
            <p className="text-white/40 text-sm">Tap <span className="text-yellow-400 font-bold">Scan</span> to check in with camera</p>
            <p className="text-white/20 text-xs mt-1">or search by name / email / order #</p>
          </div>
        )}
      </div>
    </div>
  );
}
