// Server-side spam defenses for the public forms, layered UNDER Turnstile
// rather than replacing it.
//
// Why this exists: Turnstile is working correctly — a live probe of
// /api/contact with no token and with a bogus token both return 400 — and the
// spam still arrives. Managed mode lets a large share of visitors through
// without interaction, and a solver service or headless-browser farm clears
// the rest, so a CAPTCHA alone was never going to be the whole answer.
//
// The real traffic these rules were written against (contact_submissions,
// late Sept 2026): randomly generated names like "Oxavo Vpjvgmsz", message
// bodies that are nothing but a 10-digit phone number, and one Gmail mailbox
// wearing many hats via the dot trick —
// adot.ic.edaq.671@ / a.do.ti.c.ed.aq.6.7.1@ / ad.otic.ed.aq.6.71@ are all
// the same inbox, which is how one spammer looked like dozens of people and
// slipped past the 3-day thread-merge window.
//
// Deliberately NOT included: any rule that judges whether a NAME looks real.
// Random-consonant detection would reject real people with names this
// codebase's author has never seen, and a wrongly-rejected customer is worse
// than a spam row an admin deletes.

/** Hidden field name. Real people never see it; bots fill every input they find. */
export const HONEYPOT_FIELD = "company_website";

/**
 * True when the hidden field came back with anything in it. A browser leaves
 * it empty because it is visually hidden and marked not-a-real-field for
 * assistive tech and autofill alike.
 */
export function honeypotTripped(body: Record<string, unknown>): boolean {
  const v = body?.[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Collapses the addresses that reach the same mailbox, so one spammer counts
 * as one sender. Gmail ignores dots entirely and everything after a `+`;
 * most other providers honour `+` tags too but treat dots as significant, so
 * dots are only stripped for Gmail.
 */
export function normalizeEmail(email: string): string {
  const trimmed = (email || "").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

/**
 * Returns a short reason when a submission is almost certainly automated, or
 * null to let it through. Kept narrow on purpose — each rule has to be one a
 * real customer could not plausibly trip.
 */
export function automatedSubmissionReason(fields: {
  name?: string;
  email?: string;
  message?: string;
}): string | null {
  const message = (fields.message || "").trim();

  // Every spam body in the observed run was a bare phone number. A genuine
  // message always contains words; one with no letters at all never does.
  if (message && !/\p{L}/u.test(message)) {
    return "message contains no letters";
  }

  // A message that is only a phone number, even with words like "call me"
  // stripped of letters above, still gets caught by the digit-density check:
  // 10+ digits and almost nothing else.
  const digits = (message.match(/\d/g) || []).length;
  const letters = (message.match(/\p{L}/gu) || []).length;
  if (digits >= 7 && letters <= 2) {
    return "message is essentially just digits";
  }

  return null;
}

/** Standard rejection. Deliberately vague so a bot learns nothing from it. */
export const SPAM_REJECTION = {
  error: "We couldn't accept this submission. Please try again or email us directly.",
} as const;
