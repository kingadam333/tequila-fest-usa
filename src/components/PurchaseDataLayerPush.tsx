"use client";

import { useEffect } from "react";

export interface PurchaseData {
  transactionId: string;
  value: number;
  currency?: string;
  quantity?: number;
  itemName: string;
  itemCity?: string;
  email?: string;
  phone?: string;
}

// Shared by all post-payment confirmation pages (tickets, brand packages,
// vendor spots) so every purchase type feeds the same dataLayer shape GTM's
// pre-built Meta Pixel / GA4 tags expect (nested under eventModel, with
// user_data for Advanced Matching) instead of each page reinventing this.
export default function PurchaseDataLayerPush({ data }: { data: PurchaseData }) {
  useEffect(() => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "purchase",
      eventModel: {
        transaction_id: data.transactionId,
        value: data.value,
        currency: data.currency || "USD",
        items: [{
          item_id: data.itemName,
          item_name: data.itemName,
          item_city: data.itemCity || "",
          quantity: data.quantity ?? 1,
          price: data.value,
        }],
        user_data: {
          email_address: data.email || undefined,
          phone_number: data.phone || undefined,
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.transactionId]);

  return null;
}
