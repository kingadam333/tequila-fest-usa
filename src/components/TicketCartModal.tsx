"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, User, Mail, Phone, ArrowRight, Loader2, ShoppingCart, Tag } from "lucide-react";
import type { TicketType } from "@/lib/ticket-config";
import { TICKET_LABELS } from "@/lib/ticket-config";
import { calculateFeesForCart } from "@/lib/fees";
import Turnstile from "@/components/Turnstile";

interface TicketTypeOption {
  key: TicketType;
  label: string;
  price: number;
  platformFee?: number;  // per-ticket platform fee, defaults to $3
  soldOut: boolean;
  available: boolean;
  note?: string;
}

interface CartItem {
  ticketType: TicketType;
  quantity: number;
  price: number;
}

interface Props {
  eventSlug: string;
  eventCity: string;
  eventColor: string;
  ticketTypes: TicketTypeOption[];
  initialType?: TicketType;
  onClose: () => void;
}

export default function TicketCartModal({
  eventSlug, eventCity, eventColor, ticketTypes, initialType, onClose,
}: Props) {
  const [step, setStep] = useState<"cart" | "info">("cart");
  const [cart, setCart] = useState<Record<TicketType, number>>(() => {
    const init: Record<string, number> = {};
    if (initialType) init[initialType] = 1;
    return init as Record<TicketType, number>;
  });
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [sessionUser, setSessionUser] = useState<{ firstName: string; lastName: string; email: string; phone: string } | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [quotedPromo, setPromo] = useState<{ code: string; discount: number; label: string; cartKey: string } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  // A logged-in customer skips re-typing info they already have on file —
  // shown as a summary card instead of the editable form.
  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(({ user }) => {
        if (!user) return;
        setSessionUser(user);
        setForm({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const updateQty = (type: TicketType, delta: number) => {
    setCart(prev => {
      const next = { ...prev };
      const current = next[type] || 0;
      const newQty = Math.max(0, Math.min(10, current + delta));
      if (newQty === 0) delete next[type];
      else next[type] = newQty;
      return next;
    });
  };

  const cartItems: CartItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([type, qty]) => {
      const tt = ticketTypes.find(t => t.key === type);
      return { ticketType: type as TicketType, quantity: qty, price: tt?.price || 0 };
    });

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalTickets = cartItems.reduce((s, i) => s + i.quantity, 0);
  const fees = totalTickets > 0 ? calculateFeesForCart(
    cartItems.map(i => {
      const tt = ticketTypes.find(t => t.key === i.ticketType);
      return { price: i.price, quantity: i.quantity, platformFee: tt?.platformFee ?? 3.00 };
    })
  ) : null;
  const canProceed = totalTickets > 0;
  // A discount is quoted for a specific cart; once the cart changes it no
  // longer applies (the server recomputes it at checkout anyway).
  const cartKey = cartItems.map(i => `${i.ticketType}:${i.quantity}`).join(",");
  const promo = quotedPromo && quotedPromo.cartKey === cartKey ? quotedPromo : null;
  const discount = promo?.discount ?? 0;
  const grandTotal = fees ? Math.max(0, fees.total - discount) : 0;

  const applyPromo = async () => {
    if (!promoInput.trim() || !canProceed) return;
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput, eventSlug, items: cartItems, email: form.email }),
      });
      const data = await res.json();
      if (data.ok) {
        setPromo({ code: data.code, discount: data.discount, label: data.label, cartKey });
        setPromoInput("");
      } else {
        setPromo(null);
        setPromoError(data.error || "That promo code isn't valid.");
      }
    } catch {
      setPromoError("Couldn't check that code. Please try again.");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) return;
    if (!captchaToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/pre-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          eventSlug,
          items: cartItems,
          captchaToken,
          couponCode: promo?.code,
          refCode: typeof window !== "undefined" ? localStorage.getItem(`ref_${eventSlug}`) || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // GTM's Meta Pixel template maps "begin_checkout" -> InitiateCheckout
        // via its FBEventName variable, reading nested eventModel.* fields.
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: "begin_checkout",
          eventModel: {
            currency: "USD",
            value: data.totalAmount ?? subtotal,
            transaction_id: data.orderNumber,
            items: cartItems.map(i => ({
              item_id: i.ticketType,
              item_name: TICKET_LABELS[i.ticketType],
              quantity: i.quantity,
              price: i.price,
            })),
            user_data: {
              email_address: form.email,
              phone_number: form.phone || undefined,
            },
          },
        });
        window.location.href = data.url;
      } else {
        // e.g. the code hit its per-customer limit once the email was known
        if (data.couponError) setPromo(null);
        setError(data.error || "Something went wrong. Please try again.");
        setCaptchaToken("");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setCaptchaToken("");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg bg-[#0d0500] border border-white/15 rounded-3xl shadow-2xl overflow-hidden"
          style={{ boxShadow: `0 0 60px ${eventColor}20`, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
            <div>
              <p className="text-white/80 text-xs font-bold tracking-[0.2em] uppercase">
                {step === "cart" ? "Select Tickets" : "Your Info"}
              </p>
              <h2 className="font-display text-white text-2xl leading-none">
                TEQUILA FEST <span style={{ color: eventColor }}>{eventCity.toUpperCase()}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {step === "info" && (
                <button onClick={() => setStep("cart")} className="text-white/80 hover:text-white/60 text-sm transition-colors cursor-pointer">
                  ← Back
                </button>
              )}
              <button onClick={onClose} className="text-white/80 hover:text-white/60 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">

            {/* ─── Step 1: Cart ─── */}
            {step === "cart" && (
              <div className="p-5 space-y-3">
                {ticketTypes.map(tt => {
                  const qty = cart[tt.key] || 0;
                  const isSoldOut = tt.soldOut;
                  const isUnavailable = !tt.available || isSoldOut;
                  return (
                    <div key={tt.key}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${isUnavailable ? "opacity-40 border-white/10" : qty > 0 ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.02]"}`}
                      style={qty > 0 ? { borderColor: `${eventColor}50`, background: `${eventColor}08` } : {}}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-sm">{tt.label}</p>
                          {isSoldOut && <span className="text-red-400 text-xs font-bold bg-red-500/15 px-2 py-0.5 rounded-full">Sold Out</span>}
                          {!isSoldOut && tt.note && <span className="text-white/80 text-xs">{tt.note}</span>}
                        </div>
                        <p className="font-display mt-0.5" style={{ fontSize: "1.5rem", color: qty > 0 ? eventColor : "white" }}>
                          ${tt.price}
                          <span className="text-white/80 text-xs font-sans ml-1">per person</span>
                        </p>
                      </div>
                      {!isUnavailable ? (
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button onClick={() => updateQty(tt.key, -1)} disabled={qty === 0}
                            className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 disabled:opacity-30 transition-all cursor-pointer touch-manipulation">
                            <Minus size={16} />
                          </button>
                          <span className="font-bold text-white w-4 text-center text-lg">{qty}</span>
                          <button onClick={() => updateQty(tt.key, 1)} disabled={qty >= 10}
                            className="w-11 h-11 rounded-full border flex items-center justify-center font-bold transition-all cursor-pointer touch-manipulation"
                            style={qty > 0 ? { borderColor: eventColor, color: eventColor } : { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}>
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/80 text-xs flex-shrink-0">
                          {isSoldOut ? "Sold Out" : "Coming Soon"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Step 2: Info ─── */}
            {step === "info" && (
              <div className="p-5">
                {error && (
                  <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
                )}

                {sessionUser && !editingInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/15 rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-white/80 text-xs">Checking out as</p>
                        <p className="text-white font-semibold text-sm truncate">{form.firstName} {form.lastName}</p>
                        <p className="text-white/80 text-sm truncate">{form.email}</p>
                      </div>
                      <button type="button" onClick={() => setEditingInfo(true)}
                        className="text-yellow-500/70 hover:text-yellow-400 text-xs font-semibold flex-shrink-0 cursor-pointer">
                        Not you?
                      </button>
                    </div>
                    <form id="checkout-form" onSubmit={handleCheckout}>
                      <Turnstile
                        onVerify={setCaptchaToken}
                        onError={() => setCaptchaToken("")}
                        onExpire={() => setCaptchaToken("")}
                      />
                    </form>
                  </div>
                ) : (
                  <form id="checkout-form" onSubmit={handleCheckout} className="space-y-3">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/80" />
                        <input type="text" value={form.firstName} onChange={set("firstName")}
                          placeholder="First name" required autoFocus
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-3 py-3 text-white placeholder-white/25 text-sm outline-none" />
                      </div>
                      <div className="flex-1">
                        <input type="text" value={form.lastName} onChange={set("lastName")}
                          placeholder="Last name" required
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/80" />
                      <input type="email" value={form.email} onChange={set("email")}
                        placeholder="Email address" required
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm outline-none" />
                    </div>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/80" />
                      <input type="tel" value={form.phone} onChange={set("phone")}
                        placeholder="Phone number (optional)"
                        className="w-full bg-white/5 border border-yellow-500/15 focus:border-yellow-500/40 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm outline-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500/50 text-xs font-semibold hidden sm:block">⚡ Flash Deals</span>
                    </div>
                    <Turnstile
                      onVerify={setCaptchaToken}
                      onError={() => setCaptchaToken("")}
                      onExpire={() => setCaptchaToken("")}
                    />
                  </form>
                )}
                <p className="text-white/80 text-xs text-center mt-3">
                  By continuing you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline">Terms of Service</a>. Must be 21+. All sales final — no refunds.
                </p>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="flex-shrink-0 border-t border-white/10 p-4">
            {/* Cart summary chips */}
            {cartItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {cartItems.map(item => (
                  <span key={item.ticketType} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                    {TICKET_LABELS[item.ticketType]} ×{item.quantity}
                  </span>
                ))}
              </div>
            )}

            {/* Fee breakdown */}
            {fees && (
              <div className="space-y-1.5 mb-3 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Tickets ({totalTickets})</span>
                  <span className="text-white/70">${fees.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/80">Service Fee</span>
                    <div className="group relative">
                      <span className="text-white/80 text-xs cursor-help border border-white/15 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
                      <div className="absolute bottom-6 left-0 w-52 bg-black/90 border border-white/15 rounded-xl p-3 text-xs text-white/60 hidden group-hover:block z-10 pointer-events-none">
                        <p className="mb-1">Platform fee: ${fees.platformFee.toFixed(2)} (${fees.platformFee / totalTickets}/ticket)</p>
                        <p>Processing: ${fees.stripeFee.toFixed(2)} (2.9% + $0.30)</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-white/70">${fees.serviceFee.toFixed(2)}</span>
                </div>
                {promo && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-green-400">
                      <Tag size={12} /> {promo.code} <span className="text-white/50 text-xs">({promo.label})</span>
                      <button type="button" onClick={() => setPromo(null)} className="text-white/50 hover:text-white text-xs underline cursor-pointer">remove</button>
                    </span>
                    <span className="text-green-400">−${discount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {fees && !promo && (
              <div className="mb-3">
                {showPromo ? (
                  <div>
                    <div className="flex gap-2">
                      <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                        placeholder="Promo code" aria-label="Promo code" autoComplete="off"
                        className="flex-1 min-w-0 bg-white/5 border border-white/15 focus:border-white/30 rounded-xl px-3 py-2 text-white text-sm font-mono outline-none placeholder-white/30" />
                      <button type="button" onClick={applyPromo} disabled={promoBusy || !promoInput.trim()}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                        {promoBusy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {promoError && <p className="text-red-400 text-xs mt-1.5">{promoError}</p>}
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowPromo(true)} className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs underline cursor-pointer">
                    <Tag size={12} /> Have a promo code?
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <ShoppingCart size={14} />
                <span>{totalTickets} ticket{totalTickets !== 1 ? "s" : ""}</span>
              </div>
              <div className="text-right">
                <p className="font-display text-white text-2xl">${grandTotal.toFixed(2)}</p>
                <p className="text-white/80 text-xs">total incl. fees</p>
              </div>
            </div>

            {step === "cart" ? (
              <button onClick={() => setStep("info")} disabled={!canProceed}
                className="w-full flex items-center justify-center gap-2 font-bold text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: canProceed ? eventColor : "rgba(255,255,255,0.1)", color: canProceed ? "#0d0500" : "rgba(255,255,255,0.3)" }}>
                {canProceed ? <>Continue <ArrowRight size={18} /></> : "Select at least one ticket"}
              </button>
            ) : (
              <button type="submit" form="checkout-form"
                disabled={loading || !form.firstName || !form.email || !captchaToken}
                className="w-full flex items-center justify-center gap-2 font-bold text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: eventColor, color: "#0d0500" }}>
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Redirecting...</>
                  : <>Pay ${grandTotal.toFixed(2)} <ArrowRight size={18} /></>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
