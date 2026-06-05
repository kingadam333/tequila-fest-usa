import type { Metadata } from "next";
import { Suspense } from "react";
import ConfirmationPage from "./ConfirmationPage";

export const metadata: Metadata = {
  title: "Order Confirmed — Tequila Fest USA",
};

// This page reads search params — must be dynamic
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConfirmationPage />
    </Suspense>
  );
}
