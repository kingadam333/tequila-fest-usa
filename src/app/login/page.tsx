import type { Metadata } from "next";
import { Suspense } from "react";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "Log In — Tequila Fest USA",
};

export default function Page() {
  return <Suspense><LoginPage /></Suspense>;
}
