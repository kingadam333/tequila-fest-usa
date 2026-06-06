/**
 * Tequila Fest USA ticket fee calculation
 *
 * Platform fee: $3.00 per ticket
 * Stripe processing: 2.9% of ticket subtotal + $0.30 per transaction
 * Service fee shown to customer = platform fee + Stripe fee (combined)
 */

export const PLATFORM_FEE_PER_TICKET = 3.00;   // $3 per ticket
export const STRIPE_RATE = 0.029;               // 2.9%
export const STRIPE_FIXED = 0.30;               // $0.30 per transaction

export interface FeeBreakdown {
  subtotal: number;       // ticket prices only
  platformFee: number;    // $3 × qty
  stripeFee: number;      // 2.9% × subtotal + $0.30
  serviceFee: number;     // platformFee + stripeFee (shown as one line)
  total: number;          // subtotal + serviceFee
}

/**
 * Calculate the full fee breakdown for an order.
 * @param subtotal - Total ticket price (before fees), in dollars
 * @param totalQty - Total number of tickets across all types
 */
export function calculateFees(subtotal: number, totalQty: number): FeeBreakdown {
  const platformFee = parseFloat((PLATFORM_FEE_PER_TICKET * totalQty).toFixed(2));
  const stripeFee = parseFloat((subtotal * STRIPE_RATE + STRIPE_FIXED).toFixed(2));
  const serviceFee = parseFloat((platformFee + stripeFee).toFixed(2));
  const total = parseFloat((subtotal + serviceFee).toFixed(2));
  return { subtotal, platformFee, stripeFee, serviceFee, total };
}

/** Returns service fee amount in cents for Stripe line item */
export function serviceFeeCents(subtotal: number, totalQty: number): number {
  const { serviceFee } = calculateFees(subtotal, totalQty);
  return Math.round(serviceFee * 100);
}
