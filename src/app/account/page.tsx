import type { Metadata } from "next";
import AccountPage from "./AccountPage";

export const metadata: Metadata = {
  title: "My Account — Tequila Fest USA",
};

export default function Page() {
  return <AccountPage />;
}
