import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sponsorDb, loadPaymentSettings, depositFor, type SponsorReservation } from "@/lib/sponsorReservations";
import PayPageClient from "./PayPageClient";

export const metadata: Metadata = {
  title: "Sponsorship Payment | Tequila Fest USA",
  robots: { index: false, follow: false },
};

// Always read live status — the Stripe webhook updates it after checkout.
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();

  const { data } = await sponsorDb().from("sponsor_reservations").select("*").eq("pay_token", token).maybeSingle();
  const r = data as SponsorReservation | null;
  if (!r) notFound();

  const settings = await loadPaymentSettings();
  return (
    <PayPageClient
      token={token}
      paidKind={paid === "full" || paid === "deposit" || paid === "balance" ? paid : null}
      reservation={{
        company_name: r.company_name,
        contact_name: r.contact_name,
        contact_email: r.contact_email,
        package_name: r.package_name,
        events: r.events,
        total: r.total,
        amount_paid: r.amount_paid,
        status: r.status,
        payment_method: r.payment_method,
        invoice_number: r.invoice_number,
        invoice_due_date: r.invoice_due_date,
        deposit_paid_at: r.deposit_paid_at,
        paid_at: r.paid_at,
        created_at: r.created_at,
      }}
      deposit={depositFor(r.total)}
      settings={settings}
    />
  );
}
