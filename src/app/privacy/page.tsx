import type { Metadata } from "next";
import PrivacyPage from "./PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Tequila Fest USA",
  description: "How Tequila Fest USA collects, uses, and protects your personal information.",
};

export default function Page() {
  return <PrivacyPage />;
}
