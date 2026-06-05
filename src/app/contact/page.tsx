import type { Metadata } from "next";
import ContactPage from "./ContactPage";

export const metadata: Metadata = {
  title: "Contact — Tequila Fest USA",
  description: "Get in touch with the Tequila Fest USA team — general inquiries, sponsorships, vendor applications, and press.",
};

export default function Page() {
  return <ContactPage />;
}
