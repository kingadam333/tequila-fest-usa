/**
 * Cloudflare Turnstile server-side verification
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Dev-only bypass — a missing secret in production must fail closed, not
  // silently skip verification. This exact gap (secret never set on Vercel)
  // is what let every form ship live with siteverify never actually called.
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification (non-production only)");
      return true;
    }
    console.error("TURNSTILE_SECRET_KEY not set in production — rejecting request instead of silently skipping CAPTCHA verification");
    return false;
  }

  if (!token) return false;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success !== true) {
      // Cloudflare's error-codes are the only way to tell "bad/expired
      // token" apart from "this secret doesn't belong to this widget"
      // (invalid-input-secret) — logging them is what makes a mismatched
      // secret/sitekey pair actually diagnosable instead of a silent no-op.
      console.error("Turnstile siteverify rejected token:", JSON.stringify(data["error-codes"] || data));
    }
    return data.success === true;
  } catch (err) {
    console.error("Turnstile siteverify request failed:", err);
    return false;
  }
}
