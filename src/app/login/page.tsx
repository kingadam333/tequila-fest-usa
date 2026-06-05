import type { Metadata } from "next";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "Sign In — Tequila Fest USA",
};

export default function Page() {
  return <LoginPage />;
}
