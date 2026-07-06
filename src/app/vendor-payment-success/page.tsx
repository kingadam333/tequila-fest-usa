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

// This page didn't exist previously, even though the vendor Stripe checkout
// session's success_url has always pointed here — every vendor who paid was
// hitting a 404 immediately after payment. Looks up the paid vendor by the
// vendor_application_id in the Stripe session's metadata (vendor_applications
// doesn't store the Stripe session id directly, only the payment intent id,
// set once the webhook confirms payment).
async function loadVendorOrder(sessionId: string) {
  if (!sessionId) return null;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const vendorApplicationId = session.metadata?.vendor_application_id;
    if (!vendorApplicationId) return null;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const { supabaseAdmin } = await import("@/lib/supabase");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data } = await db
      .from("vendor_applications")
      .select("business_name, cities, paid, order_number")
      .eq("id", vendorApplicationId)
      .maybeSingle();
    if (!data) return null;

    return {
      businessName: data.business_name,
      cities: data.cities || [],
      paid: data.paid,
      orderNumber: data.order_number,
      amount: (session.amount_total || 0) / 100,
    };
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const order = await loadVendorOrder(session_id || "");

  return (
    <>
      {order && order.paid && order.orderNumber && (
        <PurchaseDataLayerPush
          data={{
            transactionId: order.orderNumber,
            value: order.amount,
            itemName: `Vendor Spot — ${order.businessName}`,
            itemCity: order.cities.map((c: string) => CITY_LABELS[c] || c).join(", "),
          }}
        />
      )}
      <OfficialBanner />
      <Navbar />
      <main className="bg-[#0d0500] min-h-screen pt-24 pb-24">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-display text-yellow-400 text-5xl sm:text-6xl tracking-wider mb-3">¡SALUD!</p>
          <h1 className="text-white text-3xl sm:text-4xl font-display tracking-wider mb-4">YOU'RE CONFIRMED</h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Your vendor spot payment is confirmed. We just sent a confirmation email with your order details and QR pass — check your inbox.
          </p>

          {order ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 text-left space-y-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Order</p>
                <p className="text-white font-mono">{order.orderNumber || "Processing…"}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Business</p>
                <p className="text-white font-semibold">{order.businessName}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Cities</p>
                <p className="text-white">{order.cities.map((c: string) => CITY_LABELS[c] || c).join(", ") || "TBD"}</p>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                <p className="text-white/40 text-xs uppercase tracking-wider">Total</p>
                <p className="font-display text-3xl text-yellow-400">${order.amount.toFixed(2)}</p>
              </div>
              {!order.paid && (
                <p className="text-white/40 text-xs">Payment confirmation pending — this page will reflect your order number once Stripe confirms.</p>
              )}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white/50 text-sm">
              We&apos;ve received your payment. A confirmation email is on its way.
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/vendors" className="text-white/40 hover:text-white text-sm">← Back to vendor info</Link>
            <span className="text-white/20">·</span>
            <Link href="/" className="text-white/40 hover:text-white text-sm">Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
