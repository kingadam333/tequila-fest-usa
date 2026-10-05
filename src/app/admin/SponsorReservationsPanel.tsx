"use client";

import { useEffect, useState } from "react";
import { Check, X, Mail, Phone, Globe, ExternalLink, Send, DollarSign, StickyNote } from "lucide-react";
import { sponsorEventLabel } from "@/lib/sponsorPackages";

// Admin -> Sponsors -> Requests: sponsorship reservations from "Reserve This"
// on /sponsors. Approve (emails + texts a payment link), decline, mark a Zelle
// or check payment received, resend the link/invoice, keep notes.

type Status = "pending" | "approved" | "declined" | "deposit_paid" | "paid" | "cancelled";

type Reservation = {
  id: string;
  package_name: string;
  events: string[];
  total: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  sms_consent: boolean;
  status: Status;
  payment_method: string | null;
  pay_token: string;
  amount_paid: number;
  invoice_number: string | null;
  invoice_due_date: string | null;
  admin_notes: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  pending:      { label: "Pending review", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  approved:     { label: "Approved · awaiting payment", cls: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  deposit_paid: { label: "Deposit paid · invoiced", cls: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  paid:         { label: "Paid in full", cls: "bg-green-500/10 text-green-400 border-green-500/30" },
  declined:     { label: "Declined", cls: "bg-red-500/10 text-red-400 border-red-500/30" },
  cancelled:    { label: "Cancelled", cls: "bg-white/5 text-white/60 border-white/15" },
};

const FILTERS: { id: "open" | Status | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Awaiting payment" },
  { id: "deposit_paid", label: "Invoiced" },
  { id: "paid", label: "Paid" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function SponsorReservationsPanel({ adminToken, onPendingCount }: { adminToken: string; onPendingCount?: (n: number) => void }) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/sponsor-reservations", { headers: { "x-admin-token": adminToken } })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) setRows(data.reservations);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adminToken]);

  useEffect(() => { onPendingCount?.(rows.filter(r => r.status === "pending").length); }, [rows, onPendingCount]);

  const act = async (r: Reservation, body: Record<string, unknown>, confirmText?: string, doneText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(r.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/sponsor-reservations/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setRows(prev => prev.map(x => (x.id === r.id ? data.reservation : x)));
      if (doneText) setNotice(doneText);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(r =>
    filter === "all" ? true :
    filter === "open" ? ["pending", "approved", "deposit_paid"].includes(r.status) :
    r.status === filter);

  const btn = "inline-flex items-center gap-1.5 text-xs font-bold tracking-wider px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = f.id === "all" ? rows.length
            : f.id === "open" ? rows.filter(r => ["pending", "approved", "deposit_paid"].includes(r.status)).length
            : rows.filter(r => r.status === f.id).length;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${filter === f.id ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" : "text-white/70 border-white/10 hover:text-white"}`}>
              {f.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">{error}</p>}
      {notice && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2">{notice}</p>}

      {loading ? (
        <p className="text-white/80 text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-white/70 text-sm">{rows.length === 0 ? "No sponsorship requests yet. They appear here when someone clicks “Reserve This” on /sponsors." : "Nothing in this view."}</p>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const st = STATUS_STYLE[r.status];
            const busy = busyId === r.id;
            const balance = r.total - r.amount_paid;
            return (
              <div key={r.id} className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-lg">{r.company_name}</p>
                    <p className="text-white/70 text-sm">{r.package_name} · {r.events.map(sponsorEventLabel).join(" + ")} · <span className="text-yellow-400 font-semibold">{money(r.total)}</span></p>
                    <p className="text-white/50 text-xs mt-0.5">Requested {fmt(r.created_at)}</p>
                  </div>
                  <span className={`text-[11px] font-bold tracking-wider border rounded-full px-2.5 py-1 ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <p className="text-white/80">{r.contact_name}</p>
                  <a href={`mailto:${r.contact_email}`} className="text-white/80 hover:text-yellow-400 inline-flex items-center gap-1.5"><Mail size={13} /> {r.contact_email}</a>
                  {r.contact_phone && (
                    <a href={`tel:${r.contact_phone}`} className="text-white/80 hover:text-yellow-400 inline-flex items-center gap-1.5">
                      <Phone size={13} /> {r.contact_phone}
                      <span className={`text-[10px] ${r.sms_consent ? "text-green-400" : "text-white/40"}`}>{r.sms_consent ? "· texts OK" : "· no texts"}</span>
                    </a>
                  )}
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-yellow-400 inline-flex items-center gap-1.5 truncate"><Globe size={13} /> {r.website.replace(/^https?:\/\//, "")}</a>
                  )}
                </div>

                {(r.status === "approved" || r.status === "deposit_paid" || r.status === "paid") && (
                  <div className="mt-3 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1">
                    {r.payment_method && <span>Method: <span className="text-white/80">{r.payment_method === "invoice" ? "deposit + invoice" : r.payment_method}</span></span>}
                    {r.amount_paid > 0 && <span>Paid: <span className="text-green-400">{money(r.amount_paid)}</span></span>}
                    {balance > 0 && r.status !== "approved" && <span>Balance: <span className="text-white/80">{money(balance)}</span></span>}
                    {r.invoice_number && <span>Invoice: <span className="text-white/80">{r.invoice_number}</span>{r.invoice_due_date ? ` · due ${r.invoice_due_date}` : ""}</span>}
                    {r.status === "approved" && r.payment_method === "zelle" && <span className="text-purple-300">Chose Zelle: watch for the payment, then mark it paid</span>}
                  </div>
                )}

                {r.admin_notes && notesOpen !== r.id && <p className="mt-3 text-xs text-white/60 whitespace-pre-line border-l-2 border-white/10 pl-3">{r.admin_notes}</p>}

                {notesOpen === r.id && (
                  <div className="mt-3 space-y-2">
                    <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setNotesOpen(null)} className="text-white/70 text-xs px-3 py-1.5 cursor-pointer">Cancel</button>
                      <button onClick={async () => { if (await act(r, { action: "save_notes", notes: notesDraft })) setNotesOpen(null); }}
                        className="bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">Save notes</button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status === "pending" && (
                    <>
                      <button className={`${btn} bg-green-500 hover:bg-green-400 text-black`}
                        onClick={() => act(r, { action: "approve" }, `Approve ${r.company_name}? They'll get an email${r.sms_consent ? " and a text" : ""} with their payment link.`, `Approved. Payment link sent to ${r.contact_email}.`)}>
                        <Check size={14} /> APPROVE
                      </button>
                      <button className={`${btn} border border-red-500/40 text-red-400 hover:bg-red-500/10`}
                        onClick={() => act(r, { action: "decline" }, `Decline ${r.company_name}? They'll get a polite email.`, "Declined. They've been emailed.")}>
                        <X size={14} /> DECLINE
                      </button>
                    </>
                  )}
                  {(r.status === "approved" || r.status === "deposit_paid") && (
                    <>
                      <button className={`${btn} bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/25`}
                        onClick={() => {
                          const method = prompt(`Mark ${money(r.status === "approved" ? r.total : balance)} received from ${r.company_name}.\nHow was it paid? Type zelle, check, or card.`, r.payment_method === "zelle" ? "zelle" : "check");
                          if (!method) return;
                          const m = method.trim().toLowerCase();
                          if (!["zelle", "check", "card"].includes(m)) { setError("Payment method must be zelle, check, or card."); return; }
                          act(r, { action: "mark_paid", method: m }, undefined, `Marked paid. Confirmation emailed to ${r.contact_email}.`);
                        }}>
                        <DollarSign size={14} /> MARK PAID
                      </button>
                      <button className={`${btn} border border-white/15 text-white/80 hover:border-white/30`}
                        onClick={() => act(r, { action: "resend_payment_link" }, undefined, r.status === "deposit_paid" ? "Invoice re-sent." : "Payment link re-sent.")}>
                        <Send size={14} /> RESEND {r.status === "deposit_paid" ? "INVOICE" : "LINK"}
                      </button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <button className={`${btn} border border-red-500/30 text-red-400/80 hover:bg-red-500/10`}
                      onClick={() => act(r, { action: "decline" }, `Withdraw the approval for ${r.company_name}? Their payment link will stop working and they'll get an email.`, "Approval withdrawn.")}>
                      <X size={14} /> WITHDRAW
                    </button>
                  )}
                  {r.status !== "pending" && r.status !== "declined" && (
                    <a href={`/sponsors/pay/${r.pay_token}`} target="_blank" rel="noopener noreferrer"
                      className={`${btn} border border-white/15 text-white/80 hover:border-white/30`}>
                      <ExternalLink size={14} /> THEIR PAGE
                    </a>
                  )}
                  <button className={`${btn} border border-white/10 text-white/60 hover:text-white`}
                    onClick={() => { setNotesDraft(r.admin_notes || ""); setNotesOpen(r.id); }}>
                    <StickyNote size={14} /> NOTES
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
