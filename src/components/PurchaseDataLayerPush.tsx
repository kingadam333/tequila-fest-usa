"use client";

import { useEffect } from "react";
import { trackPixelEvent } from "@/components/MetaPixel";

export interface PurchaseData {
  transactionId: string;
  value: number;
  currency?: string;
  quantity?: number;
  itemName: string;
  itemCity?: string;
}

// Shared by all post-payment confirmation pages (tickets, brand packages,
// vendor spots) so every purchase type feeds the same dataLayer shape for
// GTM tags (Roku, GA4, etc.) and fires the Meta Pixel Purchase event
// consistently, instead of each page reinventing this.
export default function PurchaseDataLayerPush({ data }: { data: PurchaseData }) {
  useEffect(() => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "purchase",
      transaction_id: data.transactionId,
      value: data.value,
      currency: data.currency || "USD",
      quantity: data.quantity ?? 1,
      item_name: data.itemName,
      item_city: data.itemCity || "",
    });

    // eventId = the order number, also used as the event_id on the
    // server-side Conversions API call fired from the Stripe webhook — must
    // match exactly so Meta deduplicates rather than double-counting.
    trackPixelEvent("Purchase", {
      currency: data.currency || "USD",
      value: data.value,
      content_type: "product",
      content_name: data.itemName,
      num_items: data.quantity ?? 1,
    }, data.transactionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.transactionId]);

  return null;
}
