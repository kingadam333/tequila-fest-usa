import Link from "next/link";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import PurchaseDataLayerPush from "@/components/PurchaseDataLayerPush";

export const dynamic = "force-dynamic";

const CITY_LABELS: Record<string, string> = {
  cleveland: "Cleveland, OH",
  cincinnati: "Cincinnati, OH",
  columbus: "Columbus, OH",
  phoenix: "Phoenix, AZ",
};

async function loadOrder(sessionId: string) {
  if (!sessionId) return null;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data } = await db
      .from("brand_package_orders")
      .select("order_number, brand_name, contact_name, contact_email, contact_phone, tier, cities, amount, status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const order = await loadOrder(session_id || "");

  return (
    <>
      {order && order.status === "paid" && (
        <PurchaseDataLayerPush
          data={{
            transactionId: order.order_number,
            value: Number(order.amount || 0),
            itemName: `${order.tier} Brand Package — ${order.brand_name}`,
            itemCity: (order.cities || []).map((c: string) => CITY_LABELS[c] || c).join(", "),
            email: order.contact_email || undefined,
            phone: order.contact_phone || undefined,
          }}
        />
      )}
      <OfficialBanner />
      <Navbar />
      <main className="bg-[#0d0500] min-h-screen pt-24 pb-24">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-display text-yellow-400 text-5xl sm:text-6xl tracking-wider mb-3">¡SALUD!</p>
          <h1 className="text-white text-3xl sm:text-4xl font-display tracking-wider mb-4">YOU'RE IN</h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Your brand package booking is confirmed. We just sent a receipt to your email and our team will follow up this week with onboarding details.
          </p>

          {order ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 text-left space-y-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Order</p>
                <p className="text-white font-mono">{order.order_number}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Brand</p>
                <p className="text-white font-semibold">{order.brand_name}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Package</p>
                <p className="text-white font-semibold">{order.tier} Brand Package</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Cities</p>
                <p className="text-white">{(order.cities || []).map((c: string) => CITY_LABELS[c] || c).join(", ")}</p>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                <p className="text-white/40 text-xs uppercase tracking-wider">Total</p>
                <p className="font-display text-3xl text-yellow-400">${Number(order.amount || 0).toFixed(2)}</p>
              </div>
              {order.status !== "paid" && (
                <p className="text-white/40 text-xs">Payment confirmation pending — this page will reflect "paid" once Stripe confirms.</p>
              )}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white/50 text-sm">
              We've received your payment. A confirmation email is on its way.
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/brand-packages" className="text-white/40 hover:text-white text-sm">← Back to packages</Link>
            <span className="text-white/20">·</span>
            <Link href="/" className="text-white/40 hover:text-white text-sm">Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
