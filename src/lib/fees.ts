/**
 * Tequila Fest USA ticket fee calculation
 *
 * Platform fee: $3.00 per ticket
 * Stripe processing: 2.9% of ticket subtotal + $0.30 per transaction
 * Service fee shown to customer = platform fee + Stripe fee (combined)
 */

export const DEFAULT_PLATFORM_FEE = 3.00;  // fallback if not set on ticket type
export const STRIPE_RATE = 0.029;           // 2.9%
export const STRIPE_FIXED = 0.30;           // $0.30 per transaction

export interface CartItemWithFee {
  price: number;
  quantity: number;
  platformFee: number;  // per-ticket platform fee for this type
}

export interface FeeBreakdown {
  subtotal: number;       // ticket prices only
  platformFee: number;    // sum of (platformFee × qty) across all types
  stripeFee: number;      // 2.9% × subtotal + $0.30
  serviceFee: number;     // platformFee + stripeFee (shown as one line)
  total: number;          // subtotal + serviceFee
}

/**
 * Calculate fees for a mixed cart where each ticket type has its own platform fee.
 * @param items - Cart items each with price, quantity, and per-ticket platformFee
 */
export function calculateFeesForCart(items: CartItemWithFee[]): FeeBreakdown {
  const subtotal = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
  const platformFee = parseFloat(items.reduce((s, i) => s + i.platformFee * i.quantity, 0).toFixed(2));
  const stripeFee = parseFloat((subtotal * STRIPE_RATE + STRIPE_FIXED).toFixed(2));
  const serviceFee = parseFloat((platformFee + stripeFee).toFixed(2));
  const total = parseFloat((subtotal + serviceFee).toFixed(2));
  return { subtotal, platformFee, stripeFee, serviceFee, total };
}

/**
 * Fallback: calculate fees with a flat platform fee per ticket (for migrated/simple orders).
 */
export function calculateFees(subtotal: number, totalQty: number, platformFeePerTicket = DEFAULT_PLATFORM_FEE): FeeBreakdown {
  const items: CartItemWithFee[] = [{ price: subtotal / Math.max(totalQty, 1), quantity: totalQty, platformFee: platformFeePerTicket }];
  return calculateFeesForCart(items);
}

/** Returns service fee amount in cents for Stripe line item */
export function serviceFeeCents(items: CartItemWithFee[]): number {
  const { serviceFee } = calculateFeesForCart(items);
  return Math.round(serviceFee * 100);
}
