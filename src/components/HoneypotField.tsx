"use client";

import { HONEYPOT_FIELD } from "@/lib/spamGuard";

/**
 * A field only a bot will fill in.
 *
 * Hidden with inline styles rather than `display:none` or Tailwind's `hidden`
 * so it stays invisible even if a stylesheet fails to load — a bot that reads
 * the raw HTML sees a plausible "Company Website" input either way.
 *
 * `tabIndex={-1}` keeps keyboard users from landing on it, `aria-hidden` keeps
 * screen readers from announcing it, and `autoComplete="off"` stops a browser
 * password manager from helpfully filling it and locking a real customer out
 * of the form.
 */
export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Company Website</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
