import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

// Where a brand lands after paying an admin-issued invoice through its Stripe
// Payment Link (after_completion redirect set in /api/admin/brands/invoices).
// The invoice itself is marked paid by the Stripe webhook, not by this page.
export const metadata: Metadata = { title: "Invoice Paid | Tequila Fest USA", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice } = await searchParams;
  const invoiceNumber = /^TFB-[A-Z0-9-]{4,20}$/.test(invoice || "") ? invoice : null;

  return (
    <>
      <OfficialBanner />
      <Navbar />
      <main className="bg-[#0d0500] min-h-screen pt-24 pb-24">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-display text-yellow-400 text-5xl sm:text-6xl tracking-wider mb-3">¡SALUD!</p>
          <h1 className="text-white text-3xl sm:text-4xl font-display tracking-wider mb-4">PAYMENT RECEIVED</h1>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Thank you{invoiceNumber ? <> — invoice <span className="font-mono text-white">{invoiceNumber}</span> is paid</> : " — your invoice is paid"}. Our team will be in touch with event details.
          </p>
          <p className="text-white/60 text-sm mb-10">
            Questions? Email <a href="mailto:brands@mail.tequilafestusa.com" className="text-yellow-400 hover:underline">brands@mail.tequilafestusa.com</a>.
          </p>
          <Link href="/" className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold tracking-widest text-xs px-6 py-3 rounded-xl">BACK TO TEQUILA FEST USA</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
