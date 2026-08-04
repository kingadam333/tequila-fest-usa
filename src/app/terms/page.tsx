import type { Metadata } from "next";
import TermsPage from "./TermsPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — Tequila Fest USA",
  description: "Ticket sale terms, refund policy, event conduct, and liability terms for Tequila Fest USA events.",
};

export default function Page() {
  return <TermsPage />;
}
