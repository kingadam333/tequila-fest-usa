import type { Metadata } from "next";
import SignupPage from "./SignupPage";

export const metadata: Metadata = {
  title: "Create Account — Tequila Fest USA",
};

export default function Page() {
  return <SignupPage />;
}
