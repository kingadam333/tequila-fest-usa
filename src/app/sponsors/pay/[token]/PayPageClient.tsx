"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, FileText, CheckCircle, Clock, Printer, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { sponsorEventLabel } from "@/lib/sponsorPackages";

type Reservation = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  package_name: string;
  events: string[];
  total: number;
  amount_paid: number;
  status: "pending" | "approved" | "declined" | "deposit_paid" | "paid" | "cancelled";
  payment_method: string | null;
  invoice_number: string | null;
  invoice_due_date: string | null;
  deposit_paid_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type Settings = { check_payable_to: string | null; mailing_address: string | null; zelle_handle: string | null; zelle_qr_url: string | null } | null;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtDate = (iso: string | null, dateOnly = false) =>
  iso ? new Date(dateOnly ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", ...(dateOnly ? { timeZone: "UTC" } : {}) }) : "";

export default function PayPageClient({ token, paidKind, reservation: r, deposit, settings }: {
  token: string; paidKind: "full" | "deposit" | "balance" | null; reservation: Reservation; deposit: number; settings: Settings;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showZelle, setShowZelle] = useState(r.payment_method === "zelle");
  const balance = r.total - r.amount_paid;
  const eventsText = r.events.map(sponsorEventLabel).join(" + ");

  // Back from Stripe before the webhook has landed: poll briefly until the status reflects the payment.
  const waitingOnWebhook =
    (paidKind === "deposit" && r.status === "approved") ||
    ((paidKind === "full" || paidKind === "balance") && r.status !== "paid" && r.status !== "declined" && r.status !== "cancelled");
  const [polls, setPolls] = useState(0);
  useEffect(() => {
    if (!waitingOnWebhook || polls >= 10) return;
    const t = setTimeout(() => { setPolls(p => p + 1); router.refresh(); }, 3000);
    return () => clearTimeout(t);
  }, [waitingOnWebhook, polls, router]);

  const act = async (action: "card_full" | "card_deposit" | "card_balance" | "zelle") => {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/sponsor-pay/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) { window.location.href = data.url; return; }
      if (action === "zelle") setShowZelle(true);
      setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  };

  const zelleBox = settings?.zelle_handle ? (
    <div className="mt-4 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-5">
      <p className="text-white font-bold mb-1">Send {money(balance)} by Zelle to:</p>
      <p className="text-yellow-400 font-display text-2xl break-all">{settings.zelle_handle}</p>
      {settings.zelle_qr_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.zelle_qr_url} alt="Zelle QR code" width={180} height={180} className="mt-3 rounded-xl border border-white/10 bg-white" />
      )}
      <p className="text-white/70 text-sm mt-3">
        Put <strong className="text-white">{r.invoice_number ? `invoice ${r.invoice_number}` : r.company_name}</strong> in the memo.
        We&apos;ll email your confirmation as soon as it arrives.
      </p>
    </div>
  ) : (
    <p className="mt-4 text-white/70 text-sm">Please email <a className="text-yellow-400 underline" href="mailto:sponsors@mail.tequilafestusa.com">sponsors@mail.tequilafestusa.com</a> for Zelle details.</p>
  );

  const checkBox = settings?.check_payable_to && settings?.mailing_address ? (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-white font-bold mb-1">Pay by check</p>
      <p className="text-white/70 text-sm">Payable to <strong className="text-white">{settings.check_payable_to}</strong>, mailed to:</p>
      <p className="text-white/80 text-sm whitespace-pre-line mt-1">{settings.mailing_address}</p>
      {r.invoice_number && <p className="text-white/60 text-xs mt-2">Please write invoice {r.invoice_number} in the memo.</p>}
    </div>
  ) : null;

  const summary = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2 text-sm">
      <div className="flex justify-between gap-4"><span className="text-white/60">Sponsor</span><span className="text-white font-semibold text-right">{r.company_name}</span></div>
      <div className="flex justify-between gap-4"><span className="text-white/60">Package</span><span className="text-white text-right">{r.package_name}</span></div>
      <div className="flex justify-between gap-4"><span className="text-white/60">Events</span><span className="text-white text-right">{eventsText}</span></div>
      <div className="flex justify-between gap-4 pt-2 border-t border-white/10"><span className="text-white/60">Total</span><span className="text-yellow-400 font-bold">{money(r.total)}</span></div>
      {r.amount_paid > 0 && (
        <>
          <div className="flex justify-between gap-4"><span className="text-white/60">Paid</span><span className="text-green-400">−{money(r.amount_paid)}</span></div>
          <div className="flex justify-between gap-4 font-bold"><span className="text-white">Balance</span><span className="text-white">{money(balance)}</span></div>
        </>
      )}
    </div>
  );

  // Printable invoice / receipt (Print → Save as PDF for accounting).
  const invoice = (r.status === "deposit_paid" || r.status === "paid") && (
    <div className="mt-8 rounded-2xl bg-white text-black p-6 sm:p-8 print:shadow-none print:rounded-none print:p-0">
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <p className="font-display text-2xl tracking-wider">TEQUILA FEST USA</p>
          <p className="text-gray-600 text-sm">sponsors@mail.tequilafestusa.com</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{r.status === "paid" ? "RECEIPT" : "INVOICE"}{r.invoice_number ? ` ${r.invoice_number}` : ""}</p>
          <p className="text-gray-600 text-sm">Issued {fmtDate(r.deposit_paid_at || r.paid_at || r.created_at)}</p>
          {r.status === "deposit_paid" && r.invoice_due_date && <p className="text-sm font-semibold">Balance due {fmtDate(r.invoice_due_date, true)}</p>}
        </div>
      </div>
      <p className="text-sm text-gray-600">Bill to</p>
      <p className="font-semibold">{r.company_name}</p>
      <p className="text-sm mb-6">{r.contact_name} · {r.contact_email}</p>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-300 text-left"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody>
          <tr className="border-b border-gray-200"><td className="py-2">{r.package_name} Sponsorship — {eventsText}</td><td className="py-2 text-right">{money(r.total)}</td></tr>
          {r.amount_paid > 0 && <tr><td className="py-2 text-gray-600">Payments received</td><td className="py-2 text-right text-gray-600">−{money(r.amount_paid)}</td></tr>}
          <tr className="border-t border-gray-300 font-bold"><td className="py-2">{balance > 0 ? "Balance due" : "Balance"}</td><td className="py-2 text-right">{money(balance)}</td></tr>
        </tbody>
      </table>
      {balance > 0 && (settings?.zelle_handle || (settings?.check_payable_to && settings?.mailing_address)) && (
        <div className="mt-6 text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-black">Ways to pay</p>
          <p>Card: online at this page</p>
          {settings?.zelle_handle && <p>Zelle: {settings.zelle_handle}</p>}
          {settings?.check_payable_to && settings?.mailing_address && <p>Check payable to {settings.check_payable_to}, mailed to {settings.mailing_address.replace(/\n/g, ", ")}</p>}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="print:hidden"><Navbar /></div>
      <main className="min-h-screen bg-[#0d0500] pt-28 pb-24 px-4 print:bg-white print:pt-0">
        <div className="max-w-2xl mx-auto">
          <div className="print:hidden">
            <p className="text-yellow-400 text-xs uppercase tracking-[4px] font-bold mb-2">Sponsorship</p>
            <h1 className="font-display text-white text-4xl sm:text-5xl tracking-wider mb-6">
              {r.status === "paid" ? "YOU'RE ALL SET" : r.status === "deposit_paid" ? "YOUR SPOT IS RESERVED" : "COMPLETE YOUR SPONSORSHIP"}
            </h1>

            {waitingOnWebhook && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <Clock className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-white/80 text-sm">Thanks! We&apos;re confirming your payment with Stripe. This page will update in a few seconds; your email confirmation is on its way.</p>
              </div>
            )}

            {summary}

            {error && <p className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">{error}</p>}

            {r.status === "pending" && (
              <p className="mt-6 text-white/80">Your request is being reviewed. We&apos;ll email {r.contact_email} as soon as it&apos;s approved.</p>
            )}

            {(r.status === "declined" || r.status === "cancelled") && (
              <p className="mt-6 text-white/80">This sponsorship request is no longer active. Questions? Email <a className="text-yellow-400 underline" href="mailto:sponsors@mail.tequilafestusa.com">sponsors@mail.tequilafestusa.com</a>.</p>
            )}

            {r.status === "approved" && !waitingOnWebhook && (
              <div className="mt-6 space-y-3">
                <p className="text-white/80 text-sm">Choose how you&apos;d like to pay. Your spot is held as soon as payment or the deposit is received.</p>
                <button onClick={() => act("card_full")} disabled={busy !== null}
                  className="w-full flex items-center gap-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15 p-5 text-left transition-all cursor-pointer disabled:opacity-60">
                  <CreditCard className="text-yellow-400 flex-shrink-0" />
                  <span className="flex-1"><span className="block text-white font-bold">Pay in full by card</span><span className="block text-white/60 text-sm">Secure checkout with Stripe</span></span>
                  <span className="font-display text-2xl text-yellow-400">{busy === "card_full" ? "…" : money(r.total)}</span>
                </button>
                <button onClick={() => act("zelle")} disabled={busy !== null}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/15 hover:border-white/30 bg-white/[0.03] p-5 text-left transition-all cursor-pointer disabled:opacity-60">
                  <Smartphone className="text-purple-300 flex-shrink-0" />
                  <span className="flex-1"><span className="block text-white font-bold">Pay in full by Zelle</span><span className="block text-white/60 text-sm">Confirmed once we receive it</span></span>
                  <span className="font-display text-2xl text-white">{busy === "zelle" ? "…" : money(r.total)}</span>
                </button>
                {showZelle && zelleBox}
                <button onClick={() => act("card_deposit")} disabled={busy !== null}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/15 hover:border-white/30 bg-white/[0.03] p-5 text-left transition-all cursor-pointer disabled:opacity-60">
                  <FileText className="text-white/80 flex-shrink-0" />
                  <span className="flex-1"><span className="block text-white font-bold">Pay a 10% deposit &amp; get an invoice</span><span className="block text-white/60 text-sm">Deposit by card now; we email an invoice for the {money(r.total - deposit)} balance</span></span>
                  <span className="font-display text-2xl text-white">{busy === "card_deposit" ? "…" : money(deposit)}</span>
                </button>
              </div>
            )}

            {r.status === "deposit_paid" && !waitingOnWebhook && (
              <div className="mt-6 space-y-3">
                <p className="text-white/80 text-sm">
                  We received your deposit. Your invoice for the {money(balance)} balance is below
                  {r.invoice_due_date ? <> and is due by <strong className="text-white">{fmtDate(r.invoice_due_date, true)}</strong></> : null}.
                </p>
                <button onClick={() => act("card_balance")} disabled={busy !== null}
                  className="w-full flex items-center gap-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15 p-5 text-left transition-all cursor-pointer disabled:opacity-60">
                  <CreditCard className="text-yellow-400 flex-shrink-0" />
                  <span className="flex-1"><span className="block text-white font-bold">Pay the balance by card</span><span className="block text-white/60 text-sm">Secure checkout with Stripe</span></span>
                  <span className="font-display text-2xl text-yellow-400">{busy === "card_balance" ? "…" : money(balance)}</span>
                </button>
                <button onClick={() => setShowZelle(s => !s)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/15 hover:border-white/30 bg-white/[0.03] p-5 text-left transition-all cursor-pointer">
                  <Smartphone className="text-purple-300 flex-shrink-0" />
                  <span className="flex-1 text-white font-bold">Pay the balance by Zelle</span>
                </button>
                {showZelle && zelleBox}
                {checkBox}
              </div>
            )}

            {r.status === "paid" && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-white/80 text-sm">Paid in full{r.paid_at ? ` on ${fmtDate(r.paid_at)}` : ""}. Thank you for sponsoring Tequila Fest USA! Our team will be in touch about your activation.</p>
              </div>
            )}

            {(r.status === "deposit_paid" || r.status === "paid") && (
              <button onClick={() => window.print()}
                className="mt-6 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/30 rounded-xl px-4 py-2 cursor-pointer">
                <Printer size={15} /> Print / save {r.status === "paid" ? "receipt" : "invoice"} as PDF
              </button>
            )}
          </div>

          {invoice}

          <p className="print:hidden mt-10 text-center text-white/50 text-sm flex items-center justify-center gap-2">
            <Mail size={14} /> Questions? <a className="text-yellow-400 underline" href="mailto:sponsors@mail.tequilafestusa.com">sponsors@mail.tequilafestusa.com</a>
          </p>
        </div>
      </main>
      <div className="print:hidden"><Footer /></div>
    </>
  );
}
