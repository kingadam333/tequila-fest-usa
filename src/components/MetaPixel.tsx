"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Track page views on route change (fbq itself is bootstrapped by
// MetaPixelHead, rendered directly in <head> — see layout.tsx)
function PixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
}

export default function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <Suspense fallback={null}>
      <PixelPageView />
    </Suspense>
  );
}

// Helper to fire events from anywhere. eventId, when provided, must match
// the event_id used on the server-side Conversions API call for the same
// logical event (see src/lib/metaCapi.ts) so Meta deduplicates the two
// instead of double-counting.
export function trackPixelEvent(event: string, data?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    if (eventId) {
      (window as any).fbq("track", event, data, { eventID: eventId });
    } else {
      (window as any).fbq("track", event, data);
    }
  }
}
