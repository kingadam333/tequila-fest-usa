import { createHmac, timingSafeEqual } from "node:crypto";

// Verification for Resend's inbound webhooks, which are signed with the Svix
// scheme (Resend uses Svix for delivery).
//
// Why this exists: /api/webhooks/email-inbound accepted ANY unauthenticated
// POST and inserted whatever it was handed into contact_submissions. Anyone
// who found the URL could forge an `email.received` payload and inject
// messages into any inbox — Support, Affiliates, Brands, Vendors, Press —
// appearing to come from any sender they liked.
//
// Implemented against node:crypto rather than pulling in the `svix` package:
// the scheme is a single HMAC and the project has no other use for the
// dependency.
//
// The scheme: sign `${id}.${timestamp}.${rawBody}` with HMAC-SHA256, keyed on
// the base64-decoded portion of the secret after the `whsec_` prefix, and
// compare base64 digests. The signature header can carry several
// space-separated `v1,<sig>` entries (Svix sends the old and new signature
// during a secret rotation), so any one matching is a pass.

const TOLERANCE_SECONDS = 5 * 60;

export type WebhookVerification =
  | { ok: true }
  | { ok: false; reason: string; status: number };

export function verifyResendSignature(args: {
  secret: string;
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}): WebhookVerification {
  const { secret, rawBody, svixId, svixTimestamp, svixSignature } = args;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: "missing svix-id/timestamp/signature headers", status: 401 };
  }

  // Reject stale or far-future timestamps so a captured delivery can't be
  // replayed later. The signature itself covers the timestamp, so an attacker
  // cannot move it without invalidating the digest.
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "unparseable svix-timestamp", status: 401 };
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > TOLERANCE_SECONDS) {
    return { ok: false, reason: `timestamp outside tolerance (${skew}s)`, status: 401 };
  }

  const key = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(key, "base64");
  } catch {
    return { ok: false, reason: "secret is not valid base64", status: 500 };
  }

  const expected = createHmac("sha256", keyBytes)
    .update(`${svixId}.${svixTimestamp}.${rawBody}`)
    .digest("base64");

  // Header form: "v1,<sig> v1,<sig>" — compare against each candidate.
  const candidates = svixSignature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part));

  const expectedBuf = Buffer.from(expected);
  for (const candidate of candidates) {
    const candidateBuf = Buffer.from(candidate);
    // timingSafeEqual throws on a length mismatch, so guard before comparing.
    if (candidateBuf.length === expectedBuf.length && timingSafeEqual(candidateBuf, expectedBuf)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: "no signature matched", status: 401 };
}

export function webhookSecretConfigured(envVar = "RESEND_WEBHOOK_SECRET"): boolean {
  return !!process.env[envVar]?.trim();
}
