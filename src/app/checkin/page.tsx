"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, QrCode, CheckCircle, XCircle, AlertCircle, ChevronDown, RotateCcw, Users, LogOut } from "lucide-react";

const EVENTS = [
  { slug: "cincinnati", label: "Cincinnati — Jun 13" },
  { slug: "cleveland",  label: "Cleveland — Jul 25" },
  { slug: "columbus",   label: "Columbus — Aug 8" },
  { slug: "phoenix",    label: "Phoenix — Nov 14" },
];

const TYPE_COLORS: Record<string, string> = {
  "VIP Experience":    "#C0C0C0",
  "Early Bird":        "#F5A623",
  "Regular Rate":      "#F5A623",
  "Late Registration": "#F5A623",
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
  ticket_orders: {
    order_number: string;
    customer_email: string;
    customer_name: string;
    quantity: number;
  };
}

interface Stats {
  total: number;
  checkedIn: number;
  byType: Record<string, { total: number; checkedIn: number }>;
}

export default function CheckinPortal() {
  const [token, setToken] = useState(""); // raw password OR "Bearer <jwt>"
  const [staffName, setStaffName] = useState("");
  // Login form state
  const [loginMode, setLoginMode] = useState<"staff" | "admin">("staff");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [adminPwInput, setAdminPwInput] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].slug);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<TicketResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketResult | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<"idle" | "success" | "already" | "error">("idle");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "qr-reader";
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [loginLoading, setLoginLoading] = useState(false);

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
        setToken(`Bearer ${data.token}`);
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

  // ── Stats ─────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async (t: string, ev: string) => {
    const res = await fetch(`/api/checkin/stats?event=${ev}`, {
      headers: { "x-checkin-token": t },
    });
    if (res.ok) setStats(await res.json());
    else if (res.status === 401) { setToken(""); setTokenError("Session expired"); }
  }, []);

  useEffect(() => {
    if (token) loadStats(token, selectedEvent);
  }, [token, selectedEvent, loadStats]);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/checkin/lookup?q=${encodeURIComponent(q)}&event=${selectedEvent}`, {
      headers: { "x-checkin-token": token },
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
    }
    setSearching(false);
  }, [token, selectedEvent]);

  const onSearchChange = (val: string) => {
    setSearchQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(val), 300);
  };

  // ── QR Scanner ─────────────────────────────────────────────────────────────
  const startScanner = async () => {
    setScanMode(true);
    setScannerReady(false);
    // Dynamic import so it doesn't break SSR
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Got a QR code — stop scanner and look up
          await scanner.stop();
          setScanMode(false);
          setSearchQ(decodedText);
          doSearch(decodedText);
        },
        () => {} // ignore frame errors
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

  // ── Check in ──────────────────────────────────────────────────────────────
  const checkIn = async (ticket: TicketResult, undo = false) => {
    const res = await fetch("/api/checkin/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-checkin-token": token },
      body: JSON.stringify({ ticketId: ticket.id, undo }),
    });
    const data = await res.json();

    if (undo) {
      setConfirmStatus("success");
      setConfirmMsg("Check-in undone");
      setActiveTicket({ ...ticket, status: "valid", checked_in_at: null });
      loadStats(token, selectedEvent);
      return;
    }

    if (data.alreadyCheckedIn) {
      setConfirmStatus("already");
      const t = new Date(data.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setConfirmMsg(`Already checked in at ${t}`);
    } else if (data.success) {
      setConfirmStatus("success");
      setConfirmMsg("Checked in!");
      setActiveTicket({ ...ticket, status: "checked_in", checked_in_at: new Date().toISOString() });
      loadStats(token, selectedEvent);
      // Refresh results list
      if (searchQ) doSearch(searchQ);
    } else {
      setConfirmStatus("error");
      setConfirmMsg("Error — try again");
    }

    setTimeout(() => setConfirmStatus("idle"), 3000);
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="font-display text-yellow-400 text-2xl tracking-widest mb-1">TEQUILA FEST USA</p>
            <p className="text-white/30 text-sm">Door Staff Check-In</p>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-white/[0.04] border border-white/10 rounded-xl p-1 mb-4">
            {(["staff", "admin"] as const).map(mode => (
              <button key={mode} onClick={() => { setLoginMode(mode); setTokenError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  loginMode === mode ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white/60"
                }`}>
                {mode === "staff" ? "Staff Login" : "Admin"}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
            {tokenError && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2">
                {tokenError}
              </p>
            )}

            {loginMode === "staff" ? (
              <>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsStaff()}
                    placeholder="your@email.com" autoFocus
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Password</label>
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsStaff()}
                    placeholder="Your password"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <button onClick={loginAsStaff} disabled={loginLoading || !loginEmail || !loginPassword}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all duration-200 cursor-pointer">
                  {loginLoading ? "Signing in..." : "SIGN IN"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Admin Password</label>
                  <input type="password" value={adminPwInput} onChange={e => setAdminPwInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loginAsAdmin()}
                    placeholder="Admin password" autoFocus
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm" />
                </div>
                <button onClick={loginAsAdmin} disabled={!adminPwInput}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all duration-200 cursor-pointer">
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
      {/* Header */}
      <div className="bg-black/60 border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div>
          <p className="font-display text-yellow-400 text-sm tracking-widest">TEQUILA FEST</p>
          <p className="text-white/30 text-xs">{staffName ? `Hi, ${staffName}` : "Check-In Portal"}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Event selector */}
          <div className="relative">
            <select
              value={selectedEvent}
              onChange={e => { setSelectedEvent(e.target.value); setResults([]); setSearchQ(""); setActiveTicket(null); }}
              className="appearance-none bg-white/10 border border-white/20 rounded-lg pl-3 pr-8 py-1.5 text-white text-xs outline-none cursor-pointer"
            >
              {EVENTS.map(ev => (
                <option key={ev.slug} value={ev.slug} className="bg-[#0a0a0a]">{ev.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
          <button onClick={() => setToken("")} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-yellow-400 text-2xl">{stats.checkedIn}</p>
              <p className="text-white/30 text-xs mt-0.5">Checked In</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-white text-2xl">{stats.total}</p>
              <p className="text-white/30 text-xs mt-0.5">Total Tickets</p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
              <p className="font-display text-green-400 text-2xl">
                {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
              </p>
              <p className="text-white/30 text-xs mt-0.5">Arrived</p>
            </div>
          </div>
        )}

        {/* Ticket type breakdown */}
        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 space-y-2">
            {Object.entries(stats.byType).map(([type, counts]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[type] || "#F5A623" }} />
                <span className="text-white/50 text-xs flex-1">{type}</span>
                <span className="text-white/70 text-xs tabular-nums">{counts.checkedIn}/{counts.total}</span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${counts.total > 0 ? (counts.checkedIn / counts.total) * 100 : 0}%`, background: TYPE_COLORS[type] || "#F5A623" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + scan */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQ}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Name, email, or order #..."
              className="w-full bg-white/[0.06] border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 outline-none text-sm"
            />
            {searching && (
              <svg className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
          </div>
          <button
            onClick={scanMode ? stopScanner : startScanner}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
              scanMode ? "bg-red-500/20 border border-red-500/40 text-red-400" : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
            }`}
          >
            <QrCode size={18} />
            <span className="hidden sm:inline">{scanMode ? "Stop" : "Scan"}</span>
          </button>
        </div>

        {/* QR Scanner view */}
        <AnimatePresence>
          {scanMode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="bg-black border border-white/10 rounded-2xl overflow-hidden relative">
                <div id={scannerDivId} className="w-full" style={{ minHeight: 280 }} />
                {!scannerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <p className="text-white/50 text-sm">Starting camera...</p>
                  </div>
                )}
                {scannerReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-yellow-400/60 rounded-xl" />
                  </div>
                )}
              </div>
              <p className="text-white/25 text-xs text-center mt-2">Point camera at a ticket QR code</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm toast */}
        <AnimatePresence>
          {confirmStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                confirmStatus === "success" ? "bg-green-500/20 border border-green-500/40 text-green-400" :
                confirmStatus === "already" ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400" :
                "bg-red-500/20 border border-red-500/40 text-red-400"
              }`}
            >
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
              className={`border rounded-2xl p-5 ${
                activeTicket.status === "checked_in"
                  ? "bg-green-950/30 border-green-500/40"
                  : "bg-white/[0.04] border-white/15"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {activeTicket.ticket_orders?.customer_name || activeTicket.holder_name}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{activeTicket.ticket_orders?.customer_email}</p>
                </div>
                <button onClick={() => setActiveTicket(null)} className="text-white/20 hover:text-white/50 transition-colors cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Ticket Type</p>
                  <p className="font-bold text-sm" style={{ color: TYPE_COLORS[activeTicket.ticket_type] || "#F5A623" }}>
                    {activeTicket.ticket_type}
                  </p>
                </div>
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Ticket #</p>
                  <p className="text-white font-bold text-sm">#{activeTicket.ticket_number} of {activeTicket.ticket_orders?.quantity}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Order #</p>
                  <p className="text-white/70 text-sm font-mono">{activeTicket.ticket_orders?.order_number}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl px-3 py-2.5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Status</p>
                  <p className={`text-sm font-bold ${activeTicket.status === "checked_in" ? "text-green-400" : "text-white/60"}`}>
                    {activeTicket.status === "checked_in" ? "✓ Checked In" : "Not yet"}
                  </p>
                </div>
              </div>

              {activeTicket.checked_in_at && (
                <p className="text-white/25 text-xs mb-3 text-center">
                  Checked in at {new Date(activeTicket.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

              <div className="flex gap-2">
                {activeTicket.status !== "checked_in" ? (
                  <button
                    onClick={() => checkIn(activeTicket)}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-base flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> CHECK IN
                  </button>
                ) : (
                  <button
                    onClick={() => checkIn(activeTicket, true)}
                    className="flex-1 bg-white/10 hover:bg-white/15 border border-white/15 text-white/60 font-semibold py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} /> Undo Check-In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search results list */}
        {results.length > 0 && !activeTicket && (
          <div className="space-y-2">
            <p className="text-white/30 text-xs uppercase tracking-wider px-1">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map(ticket => (
              <motion.button
                key={ticket.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { setActiveTicket(ticket); setConfirmStatus("idle"); }}
                className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all duration-200 cursor-pointer hover:border-white/25 ${
                  ticket.status === "checked_in"
                    ? "bg-green-950/20 border-green-500/30"
                    : "bg-white/[0.03] border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {ticket.ticket_orders?.customer_name || ticket.holder_name}
                    </p>
                    <p className="text-white/35 text-xs truncate mt-0.5">{ticket.ticket_orders?.customer_email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className="text-xs font-semibold" style={{ color: TYPE_COLORS[ticket.ticket_type] || "#F5A623" }}>
                      {ticket.ticket_type}
                    </span>
                    {ticket.status === "checked_in" ? (
                      <span className="text-green-400 text-[10px] flex items-center gap-0.5">
                        <CheckCircle size={10} /> In
                      </span>
                    ) : (
                      <span className="text-white/20 text-[10px]">Ticket #{ticket.ticket_number}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Empty state when searched but no results */}
        {searchQ && !searching && results.length === 0 && !activeTicket && (
          <div className="text-center py-10">
            <Users size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No tickets found for &ldquo;{searchQ}&rdquo;</p>
            <p className="text-white/15 text-xs mt-1">Try name, email, or order number</p>
          </div>
        )}

        {/* Idle state */}
        {!searchQ && results.length === 0 && !activeTicket && !scanMode && (
          <div className="text-center py-10">
            <QrCode size={36} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/25 text-sm">Scan a QR code or search by name</p>
          </div>
        )}
      </div>
    </div>
  );
}
