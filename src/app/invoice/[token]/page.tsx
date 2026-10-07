import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { InvoicePaymentSettings } from "@/lib/brandInvoiceEmail";
import PrintButton from "./PrintButton";

// Shareable brand invoice: the same content as the invoice email (line items,
// Pay Online via the invoice's Stripe Payment Link, Zelle, check), at a link
// the admin can copy from Brands -> Invoices and text/DM. The 48-hex
// view_token is the only thing guarding it, so: validate its shape, read via
// the service role, and keep it out of search engines (robots.ts too).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice | Tequila Fest USA", robots: { index: false, follow: false } };

type LineItem = { description: string; quantity: number; unit_price: number; total: number };
const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;
const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();

  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data: inv } = await db
    .from("brand_invoices")
    .select("invoice_number, event_name, line_items, total, status, due_date, paid_at, created_at, stripe_payment_link_url, brand_contacts(contact_name)")
    .eq("view_token", token)
    .maybeSingle();
  if (!inv || inv.status === "cancelled") notFound();
  const { data: settings } = await db.from("invoice_payment_settings").select("*").limit(1).maybeSingle();
  const pay = settings as InvoicePaymentSettings | null;

  const items = (inv.line_items || []) as LineItem[];
  const total = Number(inv.total);
  const paid = inv.status === "paid";
  const owed = !paid && total > 0;
  const contactName = (inv.brand_contacts as { contact_name?: string } | null)?.contact_name;
  const hasCheck = pay?.check_payable_to && pay?.mailing_address;
  const hasZelle = pay?.zelle_handle;

  return (
    <main className="min-h-screen bg-[#0d0500] text-[#fff8f0] px-4 py-10">
      <style>{"@media print { .no-print { display: none !important; } body, main { background: #fff !important; color: #000 !important; } }"}</style>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="font-display text-yellow-400 text-3xl tracking-wider">TEQUILA FEST USA</p>
            <p className="text-white/60 text-sm">Brand Invoice</p>
          </div>
          <PrintButton />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Invoice #{inv.invoice_number}</h1>
          {paid
            ? <span className="text-xs font-bold tracking-widest text-green-400 border border-green-500/40 bg-green-500/10 rounded-full px-3 py-1">PAID</span>
            : owed && <span className="text-xs font-bold tracking-widest text-yellow-400 border border-yellow-500/40 bg-yellow-500/10 rounded-full px-3 py-1">AMOUNT DUE</span>}
        </div>
        {inv.event_name && <p className="text-yellow-400 mb-1">{inv.event_name}</p>}
        <p className="text-white/60 text-sm mb-6">
          {contactName ? `For ${contactName} · ` : ""}Issued {fmtDate(inv.created_at)}{inv.due_date && owed ? ` · Due ${fmtDate(inv.due_date)}` : ""}{paid && inv.paid_at ? ` · Paid ${fmtDate(inv.paid_at)}` : ""}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-yellow-400 text-xs uppercase tracking-wider border-b border-yellow-500/60">
                <th className="text-left py-2">Description</th>
                <th className="text-center py-2 px-3">Qty</th>
                <th className="text-right py-2 px-3 whitespace-nowrap">Unit Price</th>
                <th className="text-right py-2 pl-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-white/10">
                  <td className="py-2.5">{it.description}{Number(it.total) === 0 && Number(it.unit_price) === 0 && <span className="ml-2 text-green-400 text-[10px] font-bold uppercase">(Comp)</span>}</td>
                  <td className="text-center py-2.5 px-3">{it.quantity}</td>
                  <td className="text-right py-2.5 px-3 whitespace-nowrap">{money(Number(it.unit_price))}</td>
                  <td className={`text-right py-2.5 pl-3 font-bold whitespace-nowrap ${Number(it.total) < 0 ? "text-green-400" : "text-yellow-400"}`}>{money(Number(it.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xl font-bold text-yellow-400 mt-4">Total: {money(total)}</p>

        {owed && inv.stripe_payment_link_url && (
          <div className="text-center my-10 no-print">
            <a href={inv.stripe_payment_link_url} className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg px-10 py-4 rounded-xl">Pay Invoice Online →</a>
            <p className="text-white/50 text-xs mt-2">Secure card payment via Stripe</p>
          </div>
        )}
        {paid && <p className="text-center my-10 text-green-400 font-semibold">This invoice has been paid. Thank you!</p>}
        {!paid && total <= 0 && <p className="text-center my-10 text-green-400 font-semibold">No payment due — this invoice is fully comped.</p>}

        {owed && (hasCheck || hasZelle) && (
          <div className="border-t border-white/10 pt-6 mt-6">
            <h2 className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">Other Ways to Pay</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {hasCheck && (
                <div>
                  <p className="font-bold mb-1">Pay by Check</p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Make payable to: <strong className="text-white">{pay!.check_payable_to}</strong><br />
                    Mail to:<br />
                    {pay!.mailing_address!.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
                  </p>
                </div>
              )}
              {hasZelle && (
                <div>
                  <p className="font-bold mb-1">Pay by Zelle</p>
                  <p className="text-white/70 text-sm mb-3">Send to: <strong className="text-white">{pay!.zelle_handle}</strong></p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- QR is an admin-uploaded URL; next/image would need its host configured */}
                  {pay!.zelle_qr_url && <img src={pay!.zelle_qr_url} width={160} height={160} alt="Zelle QR code" className="rounded-lg border border-white/10 bg-white" />}
                </div>
              )}
            </div>
            <p className="text-white/50 text-xs mt-5">Paying by check or Zelle? Please include invoice #{inv.invoice_number} in the memo, and let us know at brands@mail.tequilafestusa.com so we can mark it received.</p>
          </div>
        )}

        <p className="text-center text-white/50 text-xs mt-12">Tequila Fest USA · brands@mail.tequilafestusa.com</p>
      </div>
    </main>
  );
}
