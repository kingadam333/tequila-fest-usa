import { NextRequest, NextResponse } from "next/server";

// Shared auth for the Vercel Cron routes. Was copy-pasted identically into all
// three of them, which is part of why the failure below went unnoticed for so
// long — there was no single place where it could announce itself.
//
// THE FAILURE THIS EXISTS TO PREVENT: Vercel only sends the
// `Authorization: Bearer $CRON_SECRET` header when CRON_SECRET is set in the
// project's environment. If it is unset, Vercel sends no credential AND the
// check has nothing to compare against, so every scheduled run 401s — quietly,
// forever, with a perfectly healthy-looking cron schedule in the dashboard.
// That is exactly what happened: repair-logins fired every 2 hours for eight
// weeks and rejected itself every single time, so the one-time backfill of 256
// customer logins never processed a row, and the weekly abandoned-checkout
// recovery emails never went out.
//
// Failing closed is correct and stays. Failing SILENTLY is the bug, so an
// unauthorized request now says which of the possible causes it hit.
//
// Note on `x-vercel-cron`: it is used only to tell "our own scheduled job was
// rejected" apart from "a bot poked a public URL" when writing the log line.
// It is deliberately NOT accepted as a credential.

export type CronJobName =
  | "repair-logins"
  | "abandoned-checkout-recovery"
  | "social-auto-post";

/**
 * Returns null when the caller is authorized, or the 401 response to return.
 *
 *   const denied = authorizeCron(req, "repair-logins");
 *   if (denied) return denied;
 */
export function authorizeCron(req: NextRequest, job: CronJobName): NextResponse | null {
  // Compare against the RAW value, not a trimmed one: Vercel builds the header
  // from the stored value verbatim, so a secret saved with stray whitespace
  // still matches itself. `trim()` is only used to decide whether a value that
  // is present is actually meaningful.
  const cronSecret = process.env.CRON_SECRET;
  const cronSecretSet = !!cronSecret?.trim();
  const auth = req.headers.get("authorization") || "";
  const adminToken = req.headers.get("x-admin-token");
  const looksLikeVercelCron = req.headers.get("x-vercel-cron") !== null;

  // Vercel Cron: Authorization: Bearer $CRON_SECRET, sent automatically.
  if (cronSecretSet && auth === `Bearer ${cronSecret}`) return null;

  // Manual trigger from the admin dashboard.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminToken && adminPassword && adminToken === adminPassword) return null;

  if (!cronSecretSet) {
    console.error(
      `[cron:${job}] REJECTED because CRON_SECRET is not set in this environment. ` +
        `Every scheduled run will 401 until it is added to the Vercel project ` +
        `(Settings -> Environment Variables, Production) AND the project is redeployed ` +
        `so the new value is bound to a deployment.`,
    );
  } else if (looksLikeVercelCron) {
    console.error(
      `[cron:${job}] REJECTED a request from Vercel Cron: its Authorization header does not ` +
        `match CRON_SECRET. The secret was most likely rotated without redeploying, so the ` +
        `running deployment still carries the previous value.`,
    );
  } else {
    console.warn(`[cron:${job}] rejected an unauthenticated request.`);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Whether a usable CRON_SECRET is present. For diagnostics only — never the value. */
export function cronSecretConfigured(): boolean {
  return !!process.env.CRON_SECRET?.trim();
}
