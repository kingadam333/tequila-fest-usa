// Post-login redirect target from a ?redirect= query param. Only same-site
// paths are allowed: a raw value let /login?redirect=https://evil.example
// bounce a customer off the real login page to a lookalike site (open
// redirect, a phishing aid). Rejects absolute URLs, protocol-relative
// "//host", backslash variants, and anything that the URL parser resolves to
// another origin (e.g. "/\t/host", since browsers strip tabs/newlines).
const BASE = "https://same-site.invalid";

export function safeRedirectPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
