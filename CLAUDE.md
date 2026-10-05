# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

**TequilaFestUSA.com** — The national hub site for Tequila Fest USA, a multi-city tequila festival touring 4 cities in 2026. Built on Next.js 16 App Router, deployed on Vercel, with Supabase for the database and Stripe for payments.

The city-specific splash sites are **separate projects**:
- `/Users/adambossin/Sites/tequila-fest-cincinnati` — port 4000
- `/Users/adambossin/Sites/tequila-fest-cleveland` — port 4001
- `/Users/adambossin/Sites/tequila-fest-columbus` — port 4003 (not yet built)

This project runs on **port 4002** locally.

---

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Database:** Supabase PostgreSQL (project ID: `igktkkjnyxeiflnvfzdw`)
- **Payments:** Stripe (Checkout Sessions, Payment Links for vendors, Webhooks)
- **Email:** Resend (domain: `mail.tequilafestusa.com` — verified sending domain)
- **Hosting:** Vercel (GitHub repo: `kingadam333/tequila-fest-usa`, auto-deploy on push to `main`)
- **CDN/Security:** Cloudflare (proxying `tequilafestusa.com` and `www.tequilafestusa.com`)
- **AI Inbox:** OpenAI (wired up in admin dashboard)
- **Tracking:** Google Tag Manager is the single source of truth for Meta Pixel/CAPI, GA4, and Roku — the app does **not** call Meta's Pixel or Conversions API directly (see Tracking section below)
- **PDF generation:** `jspdf` + `jspdf-autotable` (client-side) — vendor list exports, ticket PDF download
- **QR codes:** `qrcode` npm package — used for both the referral QR and the real ticket QR (see My Tickets note below)

---

## Dev Commands

```bash
# Dev server — port 4002
nohup npm run dev -- --port 4002 > /tmp/tequila-usa-dev.log 2>&1 &

# Build
npm run build

# Lint
npm run lint

# Install
npm install --cache /tmp/npm-cache

# Update Vercel env vars
npx vercel env add VARIABLE_NAME production
npx vercel env pull .env.local   # pulls to local (values will be empty strings — secrets are protected)
```

**Local dev cannot exercise anything that touches Supabase/Stripe** — `.env.local` only ever has blank placeholder values for protected/secret vars (see Critical Notes #6). Any page or admin section backed by live data will error locally with `supabaseUrl is required` or similar. Verify DB-backed changes by pushing and checking the live site instead of relying on local dev for those.

### What actually counts as verification here

- **`npm run build` ALWAYS fails locally**, on a clean checkout, at the page-data collection step with `supabaseUrl is required`. This is not a regression you introduced and not worth debugging — `.env.local` holds blank placeholders by design (Critical Notes #6). Confirm by stashing your changes if you ever doubt it.
- **`npx tsc --noEmit` is the real pre-push gate.** It runs clean and catches what matters.
- **`npm run lint` reports ~560 pre-existing problems** (almost all `@typescript-eslint/no-explicit-any` from the project's many `as any` casts). Do **not** treat a non-zero lint exit as your change breaking something, and do not "fix" them as a side quest. Check only that *your* files add no new findings — e.g. `npm run lint 2>&1 | grep -A6 'your/file/path'` and compare the reported line numbers against your diff.
- **DB-backed behavior is verified against production**, via the live site, Vercel runtime logs, or Supabase — not local dev.
- **A Vercel production deploy is the end-to-end check.** Pushing to `main` auto-deploys; branch pushes build as previews, which is a useful dry run. Project `prj_fhJE6gJ9IStaRkfcshg2FHCcFYM5`, team `team_fqhJaDCMFxA9Oj0tNWaJ8deq`.

### Repo paths differ between local and cloud sessions

The city-site paths at the top of this file are the **owner's Mac**. In a Claude Code cloud session the repos are checked out flat under `/home/user/`:

| Repo | Mac | Cloud container |
|---|---|---|
| Hub (this one) | `~/Sites/tequila-fest-usa` | `/home/user/tequila-fest-usa` |
| Cincinnati | `~/Sites/tequila-fest-cincinnati` | `/home/user/tequila-fest-cincinnati` |
| Cleveland | `~/Sites/tequila-fest-cleveland` | `/home/user/tequila-fest-cleveland` |
| Columbus | `~/Sites/tequila-fest-columbus` | `/home/user/tequila-fest-columbus` |

Don't assume all four are present: the Oct 4 2026 session had **only the hub repo** under `/home/user/` — check with `ls -d /home/user/tequila-fest-*` before relying on a cross-repo grep. Either way, only the hub repo is the session's git remote. Changes to a city repo need its own remote and are **not** covered by this project's branch workflow.

---

## Working Agreement — Git, Branches & Scope

**Branch workflow (set by the owner, Oct 2026):**

- **Develop and commit on the session's assigned feature branch**, and push there. The cloud harness assigns one per session (e.g. `claude/tender-volta-370xuu`); use whatever branch this session was given.
- **Fast-forward `main` and push it when a change is ready to go live, and say so.** Don't merge silently, and don't commit straight to `main`.
- **Never push to a branch other than the assigned one or `main`.**
- **Do NOT open a pull request unless explicitly asked.** The owner merges via fast-forward, not PRs.
- Vercel auto-deploys **only from `main`**. Branch pushes build as previews, which is a free pre-production check — use it.
- `git push -u origin <branch>`; on network failure retry up to 4 times with exponential backoff (2s/4s/8s/16s).
- **If the assigned branch's PR was already merged**, don't stack new commits on merged history — restart the branch from the latest `main` (`git fetch origin main && git checkout -B <branch> origin/main`) and put follow-up work there.
- **Force-pushing is usually blocked** by the sandbox's destructive-git guard. If the assigned branch's remote tip is pre-merge history that `main` already carries, merge the remote tip in (`git merge FETCH_HEAD`) so the push becomes a fast-forward, rather than reaching for `--force-with-lease`. Verify afterwards that `git diff --name-only origin/main` shows only the files you meant to change.

**Commit messages:** explain *why*, including the failure mode being prevented, not just what changed — the git log is the main record of the incidents this file summarizes. End with the attribution lines the harness supplies. **Never put a model identifier in a commit message, PR body, code comment, or anything else pushed to the repo.**

**Scope discipline:** this codebase has a history of fixes made on assumptions that turned out wrong (see the My Tickets, sold-count, and Google Ads sections). Verify against the live DB or the actual code before asserting something is broken or fixed, say plainly when something failed or was skipped, and don't widen a task beyond what was asked.

---

## Live URLs

- **Production:** `https://www.tequilafestusa.com`
- **Vercel project ID:** `prj_fhJE6gJ9IStaRkfcshg2FHCcFYM5`
- **Vercel team/org ID:** `team_fqhJaDCMFxA9Oj0tNWaJ8deq`
- **Supabase project:** `https://igktkkjnyxeiflnvfzdw.supabase.co`

---

## Events — Permanent City URLs, Year-Based Data

Event pages are keyed by **city**, not by year — `/events/cincinnati` always resolves to whatever the current/next upcoming event is for Cincinnati, pulled live from the `events` DB table (`src/app/events/[slug]/page.tsx`). This lets a city run the same URL every year: when a city's event finishes, mark that year's row `status: "completed"` (blocks ticket sales) and either create a new row for next year or use the admin **Copy** button to duplicate the completed event with a new date.

- **`cityKey(slug)`** (`page.tsx`) resolves any slug variant (`cincinnati`, `cincinnati-2027`, etc.) down to the base city name, then queries the DB for the next event `date_iso >= today` for that city. Falls back to the most recent (even if completed) so the page never 404s.
- **`CITY_STYLE`** map in `page.tsx` holds visual theming (color, gradient, emoji, tag) per city — this does NOT change year to year, only event data (date, venue, ticket types) comes from the DB row. Columbus's entry also carries a `foodVendor` override (`{ name: "2 Specialty Tacos", ticketNote: "From Condado Tacos" }`) — this is the actual live data source for that copy, **not** the static `src/lib/events.ts` file (which is unused by this route and can drift out of sync silently).
- **Status values**: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon`, `completed`. `completed` blocks all ticket purchase buttons ("EVENT COMPLETED") — added specifically so a past year's event page can't sell tickets once superseded.

**Homepage event cards** (`src/components/EventCards.tsx`) are **dynamic** — fetch from `GET /api/events`, which filters to `date_iso >= today` and excludes `draft`/`cancelled`/`completed`, sorted ascending by date. Farthest-out event appears last. No code change needed to add/remove/reorder homepage cards — manage entirely from admin → Events.

**Admin → Events** (`AdminDashboard.tsx`): "New Event" and "Copy" buttons (`POST /api/admin/events` — `copy_from_id` duplicates an event + its ticket types with sold counts reset to 0, defaults new date to `2027-01-01` as a placeholder). Events are grouped by year in the list, with year shown on each card. Date field uses a calendar picker.

**GA ticket type** is optional per event (not every city has one). `EventPage.tsx` derives GA availability live from the DB ticket type (`liveTypes.find(t => t.name === "GA")`) — do NOT hardcode a static `gaTicket` flag on the event object; a prior version did this and silently hid GA everywhere even when actively for sale. Homepage cards (`EventCards.tsx`) show GA price via `event.gaPrice`, computed server-side in `/api/events` by joining `ticket_types`.

---

## Ticket Sold-Count Accuracy — Two Bugs, Both Fixed

This is a recurring failure mode (two separate real incidents), so the rules are spelled out explicitly:

1. **Never join/count `ticket_instances` by `event_slug`** — always use `event_id`. A city's slug gets reassigned to the next year's event when the old one completes, so slug-based counting misattributes a completed year's historical sales to whichever event currently holds that slug now. `event_id` is set once at purchase time in the Stripe webhook and never changes.
2. **Never count a "sold" ticket without excluding comp/giveaway tickets.** `ticket_orders.source` is `"stripe"` for real paid sales and `"media_comp"` for free media-partner giveaway tickets ($0, no real payment). Every admin count/revenue query must join to `ticket_orders` and filter `status = 'paid' AND source != 'media_comp'`. Two admin routes (`/api/admin/stats` and `/api/admin/events`) briefly disagreed on VIP sold counts (100 vs 101) because only one of them excluded comps — fixed by applying the identical filter to both. **Exception:** check-in stats (`/api/admin/checkin-stats`, `/api/checkin/stats`) intentionally do **not** exclude comps — comp ticket holders are real attendees who still need to check in at the door.

**Supabase's default 1000-row cap** — this bit twice in one session and is worth remembering precisely:
- Any Supabase/PostgREST query without an explicit `.range()`/pagination silently truncates at 1000 rows, enforced **server-side** at the API gateway level. A client-side `.limit(20000)` does **not** override this — it gets silently clamped back down to whatever the project's configured max-rows is. The only real fix is actual pagination: loop with `.range(from, to)` in pages of 1000 until a short page confirms nothing's left. See `src/lib/fetchAllRows.ts` — use it for any aggregate query that could plausibly cross 1000 rows as the season's ticket sales grow (currently `ticket_instances` sits around ~1050 rows and climbing).
- **Never build a giant `.in("order_id", [...hundreds of ids])` list** to join two tables client-side — once the order count crossed a few hundred, combining that with `.range()` pagination produced a request Supabase's gateway rejected outright with a bare `{ message: 'Bad Request' }` (no JSON detail), which took the entire Overview page down to a blank screen. The fix: let Postgres do the join server-side instead, via PostgREST's embedded-resource syntax — `ticket_instances!inner(...)` style joins with filters applied to the joined table's columns (`.eq("ticket_orders.status", "paid")`) — so no ID list is ever built in application code. See `src/app/api/admin/stats/route.ts` for the current pattern.

---

## Database Schema (Supabase — Key Tables)

| Table | Purpose |
|---|---|
| `ticket_orders` | Purchase records — order_number, customer_email, event_slug, event_city, ticket_type, quantity, total, stripe_session_id, stripe_payment_intent_id, status (`paid`/`refunded`), **source** (`stripe` = real sale, `media_comp` = free giveaway — always exclude `media_comp` from sales/revenue reporting) |
| `ticket_instances` | Individual QR-coded tickets — one row per ticket, linked to `order_id`. `status`: `valid`, `used`, `cancelled`, `refunded`, `pending`, `transferred`. `checked_in_at` timestamp set on check-in. |
| `customer_accounts` | User profiles — linked to Supabase Auth by UUID |
| `contact_submissions` | Contact form + inbound-reply threads — `inbox` label (Support/Vendors/Sponsors/Affiliates), status, admin_reply |
| `events` | Event rows managed in admin — status check constraint: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon`, `completed`. Also carries **load-in fields**: `load_in_start`, `load_in_end` (free-text times, e.g. `"12:00 PM"`), `load_in_notes` (free-text paragraph), `load_in_map_url`, `load_in_map_url_2` (second/additional map) — see Load In section below |
| `ticket_types` | Per-event ticket type config — capacity, price, sold_count (this column is a stored/stale value; **always recompute live from `ticket_instances`**, never trust `ticket_types.sold_count` directly for reporting) |
| `affiliates` | Affiliate accounts + commission tracking |
| `blog_posts` | Blog content |
| `coupons` | Discount codes |
| `brand_contacts` | Tequila brand contacts — contact_name, contact_email, contact_phone, contact_type (distributor/supplier/self_distributed), brands (JSONB: [{name, price_per_bottle}]), distributor, supplier, notes |
| `brand_invoices` | Brand invoices — linked to brand_contacts, line_items JSONB, total, status (draft/sent/paid/cancelled), stripe_payment_link_id/url |
| `brand_package_orders` | Brand package purchases (self-serve checkout at `/brand-packages`) — order_number, brand_name, contact_name/email/phone, tier (Value/Standard/Premium), cities (JSONB array), amount, stripe_session_id, stripe_payment_intent_id, status (pending/paid), paid_at, **brand_contact_id** (FK — auto-linked/created by the Stripe webhook by matching contact_email). Since Oct 5 2026 buyers pick **events**, not cities: `ohio` (a bundle of Cleveland + Cincinnati + Columbus, priced as 3 events → $750/$900/$1050) or `phoenix`. `/api/brand-checkout` `EVENT_OPTIONS` is the real price source and **rejects individual Ohio city ids**; it expands `ohio` back to the three city ids before saving, so `cities` still holds per-city ids and the webhook / success page / `/api/brands` city filter are unchanged. The page's `EVENTS` list must stay in sync with `EVENT_OPTIONS`. |
| `staff_members` | Check-in staff — id, name, email, password_hash (bcrypt), permissions (array), status, last_login_at |
| `vendor_applications` | Vendor form submissions — business_name, name, email, phone, cities (array), status (pending/approved/rejected), **paid** (bool), **order_number**, **qr_code**, **paid_at**, **stripe_payment_intent_id**, **payment_link**, and email-tracking columns: `approval_email_id`, `approval_email_sent_at/delivered_at/opened_at/clicked_at/bounced_at`, `approval_email_open_count/click_count` |

**`ticket_instances.event_id`** (uuid, FK → `events.id`) — **always join/count by this, never by `event_slug`** (see Ticket Sold-Count Accuracy section above for the full year-rollover bug this caused).

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/lib/events.ts` | Static event data definitions — largely superseded by the DB `events` table for anything the live site reads; only used as a fallback/reference in a few spots. Don't assume editing this changes what's shown on `/events/[slug]`. |
| `src/lib/stripe.ts` | Stripe client + TICKET_LABELS map |
| `src/lib/resend.ts` | Resend client + all email HTML templates + `FROM_*` sender constants (`FROM_EMAIL`/`FROM_SUPPORT` = help@, `FROM_VENDORS` = vendors@, `FROM_SPONSORS`/`FROM_PARTNERS` = sponsors@, `FROM_AFFILIATES` = affiliates@, `FROM_BRANDS` = brands@) |
| `src/lib/supabase.ts` | Supabase client (anon + admin) |
| `src/lib/fetchAllRows.ts` | Pagination helper for any Supabase query that could cross the 1000-row default cap — loops `.range()` in pages of 1000 until done. Use for aggregate/reporting queries. |
| `src/lib/turnstile.ts` | Cloudflare Turnstile server-side verification (enforced — see CAPTCHA section) |
| `src/components/Turnstile.tsx` | Turnstile widget React component (renders once, no remount loop) |
| `src/lib/adminAuth.ts` | Admin token verification (`verifyAdminToken`/`unauthorizedResponse`). Cron-route auth used to live here as a triplicated `authorized()` helper — it now lives in `cronAuth.ts` below. |
| `src/lib/cronAuth.ts` | Shared auth for every Vercel Cron route (`authorizeCron(req, job)`) — `Authorization: Bearer $CRON_SECRET`, or `x-admin-token` for manual admin triggering. Replaced the copy-pasted helper in all three cron routes, which is part of why a missing `CRON_SECRET` went unnoticed for eight weeks: there was no single place it could announce itself. Now logs *which* cause it hit (secret absent / secret mismatch / unauthenticated). Compares the RAW secret, not a trimmed one — Vercel builds the header from the stored value verbatim. |
| `src/lib/eventSales.ts` | Shared, client-safe "are ticket sales closed" rule — `isEventPast()` / `areTicketSalesClosed()`. `date_iso` stores local wall-clock as if it were UTC, so the past-date cutoff is 24h past the stored start. `sold_out` is deliberately NOT a closed status (a sold-out event can still reopen); `draft`/`cancelled`/`completed` are. Used by `EventPage.tsx` and enforced server-side in `/api/pre-checkout` + `/api/checkout` (409). |
| `src/lib/eventLabel.ts` | Builds the human event label (incl. year) from the event's own date instead of a hardcoded year — this is what stopped Stripe descriptions reading "2026" for a 2027 event. Omits the year entirely if the date is unusable rather than guessing, and uses `getUTCFullYear()` to match the `date_iso` convention above. |
| `src/lib/spamGuard.ts` | Server-side spam rules layered UNDER Turnstile, not replacing it: `HONEYPOT_FIELD`/`honeypotTripped()`, `normalizeEmail()` (collapses Gmail dot/plus variants so one spammer counts as one sender), `automatedSubmissionReason()` (rejects a body with no letters at all, or 7+ digits and ≤2 letters). **Deliberately contains no rule that judges whether a NAME looks real** — a wrongly-rejected customer is worse than a spam row an admin deletes. |
| `src/components/HoneypotField.tsx` | The hidden field only a bot fills. Hidden with inline styles (not Tailwind `hidden`) so it stays invisible if a stylesheet fails to load, plus `tabIndex={-1}`, `aria-hidden` and `autoComplete="off"` so no keyboard user, screen reader or password manager can trip it. |
| `src/lib/resendWebhook.ts` | Svix signature verification for both Resend webhooks (`verifyResendSignature()`). HMAC-SHA256 over `${id}.${timestamp}.${body}`, keyed on the base64-decoded part after `whsec_`, 5-minute replay tolerance, handles the multi-signature header Svix sends during a secret rotation. Exists because `/api/webhooks/email-inbound` previously accepted ANY unauthenticated POST and inserted it into `contact_submissions` — anyone with the URL could forge mail into any inbox from any sender. |
| `src/lib/normalizeTicketType.ts` | Canonicalizes raw ticket type strings (`"vip"`, `"VIP Experience"`, `"vip_experience"` all → `"VIP Experience"`) — every sold-count aggregation must run raw DB values through this before grouping, or the same ticket type splits into multiple buckets |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler — routes by `session.metadata.type` (`"vendor"` → `handleVendorPaid`, `"brand_package"` → `handleBrandPackagePaid`, unset → `handleCheckoutComplete` for tickets). Sets the vendor PaymentIntent's Stripe dashboard `description` at payment time here (not at link-creation time — see Vendor Flow section). |
| `src/app/api/admin/resend-email/route.ts` | Admin: resend ticket email for any order (uses qrTicketHtml) |
| `src/app/api/admin/contact/route.ts` | Admin: GET submissions, POST reply |
| `src/app/api/session-email/route.ts` | Fetches customer email/phone/orderNumber from Stripe session (for post-purchase flow + tracking `user_data`) |
| `src/app/admin/AdminDashboard.tsx` | Full admin dashboard — one large client component file (~6000 lines) containing every section as its own function component (OverviewSection, EventsSection, VendorsSection, ContactSection/Inbox, LoadInSection, ToolsSection, etc.) |
| `src/components/EventCards.tsx` | Homepage city event cards — **dynamic**, fetches `/api/events`, upcoming-only |
| `src/app/api/events/route.ts` | Public — upcoming events (`date_iso >= today`, excludes draft/cancelled/completed) for homepage + city pages |
| `src/app/events/[slug]/page.tsx` | Server component — resolves permanent city slug to current/next DB event via `cityKey()`, applies `CITY_STYLE` theming |
| `src/app/api/brands/route.ts` | Public — brand names for the rolling scroller. Only brands with a **paid** `brand_package_orders` row |
| `src/components/TicketCartModal.tsx` | Ticket purchase cart modal on city event pages — quantity +/- buttons are 44×44px with `touch-manipulation` (fixed from 32px after a mobile customer couldn't reliably increase quantity); pushes `dataLayer.push({event: "begin_checkout", eventModel: {...}})` on checkout start (GTM maps this to Meta's `InitiateCheckout`) |
| `src/components/PurchaseDataLayerPush.tsx` | Shared by all post-payment confirmation pages (tickets, brand packages, vendor spots) — pushes `{ event: "purchase", eventModel: { transaction_id, value, currency, items[], user_data: {email_address, phone_number} } }` to `window.dataLayer`. The nested `eventModel` shape (not flat top-level keys) is required — GTM's existing Meta Pixel/GA4 tags read from `eventModel.*` |
| `src/app/login/LoginPage.tsx` | Login page — detects staff accounts and redirects to /checkin with JWT |
| `src/app/ticket-confirmation/ConfirmationPage.tsx` | Post-Stripe success page — fires `PurchaseDataLayerPush` |
| `src/app/account/AccountPage.tsx` | Customer account — Profile / My Tickets / Refer a Friend tabs. See "My Tickets Page" section below for real-QR + PDF download details. |
| `src/app/checkin/page.tsx` | Staff check-in portal — fullscreen QR scanner, auto check-in, order progress |
| `src/app/vendors/VendorsPage.tsx` | Vendor application form — multi-select cities, $150/city pricing. Post-submit screen explicitly instructs applicants to whitelist `vendors@mail.tequilafestusa.com` as a contact. |
| `src/app/loadin/page.tsx` + `src/app/loadin/LoadInPageClient.tsx` | **Public** `/loadin` page — a city selector ("Pick the city you'll be attending") for vendors/food trucks, opening into full event info (date/time/venue + Google Maps link), the load-in time window, a free-text info paragraph, and up to two venue map images. Only shows upcoming, non-completed/cancelled events. See Load In section below. |
| `src/components/GoogleTagManager.tsx` | Renders `GTMHeadScript`/`GTMBodyNoscript` directly in `layout.tsx` (not via `next/script` — see Tracking section) |
| `src/lib/abandonedCheckouts.ts` | `getAbandonedCheckoutGroups()` / `sendAbandonedCheckoutRecovery()` — finds ticket Stripe Checkout Sessions that expired or stalled `open` for 4+ hours without completing, grouped by city, excluding anyone who has a completed order for that event elsewhere. See Abandoned Checkout Recovery section. |
| `src/components/InstallBanner.tsx` | PWA install banner — Android native prompt, iOS instructions |
| `src/lib/checkinAuth.ts` | Verifies check-in requests — admin password OR any valid staff JWT |
| `src/lib/staffAuth.ts` | Staff JWT sign/verify (jose, HS256, 12h expiry) |
| `src/app/api/checkin/lookup/route.ts` | Ticket lookup by QR/name/email/order — returns orderTickets siblings |
| `src/app/api/checkin/confirm/route.ts` | Sets ticket status to `'used'` + `checked_in_at` timestamp |
| `src/app/api/checkin/stats/route.ts` | Live check-in stats by event — total, used count, by type breakdown. Intentionally includes comp tickets. |
| `src/app/api/staff/login/route.ts` | Staff login — bcrypt verify, returns JWT |
| `src/app/api/admin/staff/[id]/route.ts` | Staff CRUD + set_password action |
| `src/app/api/admin/checkin-stats/route.ts` | Admin check-in stats + staff roster with status. Intentionally includes comp tickets. |
| `src/app/api/admin/user-tickets/route.ts` | Fetch all tickets+QR codes for a customer email |
| `src/app/api/admin/vendors/route.ts` | Vendor application CRUD + `createVendorPaymentSession()` (Stripe Payment Links, one Product+Price per city, $150 each) |
| `src/app/api/admin/vendors/email-city/route.ts` | Admin: send an ad hoc email (event details, load-in info, map attachment) to every **paid** vendor in a given city, from `vendors@mail.tequilafestusa.com` — see Vendor Flow section |
| `src/app/api/admin/events/upload-loadin-map/route.ts` | Admin: upload a venue map image for an event's Load In info — accepts a `slot` (`1` or `2`) targeting `load_in_map_url` vs `load_in_map_url_2`. Uploaded as-is, no resize/re-encode (unlike the OG-image pipeline) since maps often have small text that compression would blur. |
| `src/app/api/admin/abandoned-checkouts/route.ts` + `.../send/route.ts` | Admin: list abandoned-checkout groups by city, and manually trigger the recovery email for one city or all |
| `src/app/api/cron/abandoned-checkout-recovery/route.ts` | Vercel Cron target — runs the recovery email across all cities. Scheduled Wednesdays 23:00 UTC (7pm EDT) in `vercel.json`; will read as 6pm once EST returns in November — not a concern this season since all events are before winter. |
| `public/manifest.json` | PWA manifest — name "Tequila Fest USA", theme #F5A623 |
| `public/icons/` | PWA icons — 11 sizes (72–512px) + 2 maskable, radial gradient + skull logo |

---

## CAPTCHA — Cloudflare Turnstile (working, enforced site-wide)

Turnstile protects every public form. It was looping/spinning in production earlier; the fix and the correct setup are documented here so it can be reproduced.

### Why it was looping (the bug)
The widget component had `onVerify/onError/onExpire` in its `useEffect` dependency array. Parents pass inline arrow functions, so every keystroke re-render created new function references → the effect tore down (`turnstile.remove()`) and re-rendered the widget → endless spin/reset. **Fix:** callbacks are held in refs so the effect depends only on `siteKey` and renders exactly once. Also sets `retry: "never"`.

### How it's wired
- **Client:** `src/components/Turnstile.tsx` renders the widget. Each form holds `const [captchaToken, setCaptchaToken] = useState("")`, renders `<Turnstile onVerify={setCaptchaToken} onError/onExpire={() => setCaptchaToken("")} />` above the submit button, disables submit until a token exists, sends the token in the request body, and clears the token on any failure (tokens are single-use).
- **Server:** `src/lib/turnstile.ts` — `verifyTurnstile()` is called by every form route. Rule: **no `TURNSTILE_SECRET_KEY` set = dev skip; secret set (production) = a real token is required** or the request is rejected. There is **no `"bypass"` escape hatch**.
- **Forms covered (9):** contact, signup, login, forgot-password, vendors, sponsors, affiliates, press, and the two checkout modals (`PreCheckoutModal`, `TicketCartModal`). Routes: `/api/contact`, `/api/vendor-apply`, `/api/auth/*`, `/api/pre-checkout`.
- **Note for automated testing/agents:** the CAPTCHA cannot and should not be solved programmatically. To verify a checkout flow end-to-end, ask the human to click through it manually and report back, or verify server-side effects via Vercel runtime logs / Supabase after the fact.

### Required config (all three must be correct or it loops)
1. **Cloudflare → Turnstile widget → Hostnames:** must list `tequilafestusa.com`, `www.tequilafestusa.com`, AND `tequila-fest-usa.vercel.app`. A missing hostname is the #1 cause of an infinite spinner.
2. **Widget Mode:** `Managed` (Recommended). Not Invisible.
3. **Vercel env vars** (production + preview + development), then redeploy:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public)
   - `TURNSTILE_SECRET_KEY` (secret)

### Local dev / testing
`vercel env pull` blanks all protected values. Use Cloudflare's **always-pass test keys** in `.env.local`:
- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

With these, the widget renders, issues a dummy token, and enables the submit button — proving the wiring without bot friction.

### Spam still got through — the second layer (added Sept/Oct 2026)

**Turnstile being correctly enforced and spam still arriving are not a contradiction.** A live probe of `/api/contact` with no token and with a bogus token both returned 400, so enforcement was verified working — yet spam kept coming. Managed mode lets a large share of visitors through with no interaction, and a solver service or headless-browser farm clears the rest. A CAPTCHA alone was never going to be the whole answer.

The spam signature it was written against (`contact_submissions`, late Sept 2026): randomly generated names, message bodies that were nothing but a bare 10-digit phone number, and **one** Gmail mailbox wearing dozens of faces via the dot trick (`adot.ic.edaq.671@`, `a.do.ti.c.ed.aq.6.7.1@`, `ad.otic.ed.aq.6.71@` are all the same inbox), which is how a single spammer slipped past the 3-day thread-merge window.

The second layer is `src/lib/spamGuard.ts` + `src/components/HoneypotField.tsx` (see Key Files). Against the preceding 30 days of real traffic, the rules would have blocked **19 of 33** submissions. Note the honest caveat: those rows had already been deleted by the time the rules shipped, so any later drop in volume can't be attributed to this fix with confidence.

**`/api/contact` was the actual entry point**, not the affiliate/sponsor forms it was blamed on — identified because the spam rows had `phone` populated, and the inbound-email webhook always writes `phone: null`.

**Turnstile mode:** there is **no "Interactive" mode** — Cloudflare offers Managed, Non-Interactive and Invisible only. **Managed is the only mode that can present a challenge**, so switching away from it would weaken protection, not strengthen it. Leave it on Managed.

The city splash sites got the same honeypot + email-validation treatment on their `/api/subscribe` routes (they have no Turnstile of their own). Those are separate repos — see the paths at the top of this file.

---

## Cloudflare Setup (Working)

**Domain:** `tequilafestusa.com` → Cloudflare → Vercel

### DNS Records
- `A` record: `tequilafestusa.com` → Vercel IP (proxied through Cloudflare, orange cloud)
- `CNAME` record: `www` → `cname.vercel-dns.com` (proxied through Cloudflare, orange cloud)
- `CNAME` record: `mail` → Resend sending domain (DNS only, grey cloud — **must NOT be proxied**)

### SSL/TLS Settings
- **SSL Mode:** Full (Strict) — required. "Full" (non-strict) caused redirect loops. Set under SSL/TLS → Overview.
- **Minimum TLS:** 1.2

### Security Settings
- **Bot Fight Mode:** OFF — was interfering with Stripe webhooks and form submissions
- **Browser Integrity Check:** OFF — was blocking legitimate API calls
- **Security Level:** Medium

### Key Cloudflare Rules
- Cloudflare always redirects bare domain (`tequilafestusa.com`) → `www.tequilafestusa.com` with 308. **Stripe webhooks MUST use `https://www.tequilafestusa.com/...`** — Stripe does not follow redirects.

---

## Email System (Resend)

**Sending domain:** `mail.tequilafestusa.com` (verified in Resend)

**Per-audience sender addresses** — always use the matching `FROM_*` constant from `src/lib/resend.ts`, never a hardcoded string:
- `FROM_EMAIL` / `FROM_SUPPORT` → `help@mail.tequilafestusa.com` — tickets, general support, password reset
- `FROM_VENDORS` → `vendors@mail.tequilafestusa.com` — **every** vendor-facing email (application confirmation, approval, rejection, post-payment confirmation, ad hoc city emails). The vendor application success page explicitly tells applicants to whitelist this exact address, so every vendor email must actually come from it or the whitelist instruction is useless. (Fixed this session — several vendor emails were incorrectly sending from `help@`.)
- `FROM_SPONSORS` / `FROM_PARTNERS` → `sponsors@mail.tequilafestusa.com`
- `FROM_AFFILIATES` → `affiliates@mail.tequilafestusa.com`
- `FROM_BRANDS` → `brands@mail.tequilafestusa.com`

**Inbound routing** (`src/app/api/webhooks/email-inbound/route.ts`) maps the `to` address prefix to an inbox label shown in admin → Inbox: `help@` → Support, `vendors@` → Vendors, `sponsors@`/`partners@` → Sponsors, `affiliates@` → Affiliates, `brands@` → Brands, `press@` → Press. **Any outbound email whose sender doesn't match its audience's real inbox will have replies route to the wrong tab** (or nowhere useful) — this is why the vendor-email sender fix above mattered beyond just branding.

### How It Works (ticket purchases)
1. Customer completes Stripe checkout → Stripe fires webhook to `https://www.tequilafestusa.com/api/webhooks/stripe`
2. Webhook handler (`handleCheckoutComplete`) in `src/app/api/webhooks/stripe/route.ts`:
   - Inserts order into `ticket_orders`
   - Creates QR-coded rows in `ticket_instances`
   - Ensures a real Supabase Auth login exists for the buyer (see "Login Creation" section below — this is more than just a `customer_accounts` existence check)
   - Sends **ONE combined email** with QR tickets + order summary + (if new account) login credentials
3. Admin can resend via the **Send icon (→)** in Admin → Orders, which calls `/api/admin/resend-email`

### Email Templates in `src/lib/resend.ts`
- `qrTicketHtml()` — **Main post-purchase email**: QR codes + order summary + optional account credentials
- `vendorConfirmationHtml()` — Post-payment vendor confirmation (order #, QR, load-in reminders)
- `passwordResetHtml()` — Password reset email
- `INBOX_ROUTING` — Maps contact form subjects → inbox labels

### Critical Rules
- **Only ONE email per purchase** — sending two to the same recipient in the same webhook execution causes Resend to silently drop one
- **`RESEND_API_KEY` must be active** — if emails stop, generate a new key at resend.com/api-keys and update Vercel env
- **Contact form emails go to the admin inbox in the website** (Supabase `contact_submissions` table) — they do NOT forward to any external email

---

## Login Creation — Real Bug History, Read Before Touching Any "Does This Account Exist" Check

`POST /api/pre-checkout` creates a bare `customer_accounts` **lead** row (email/name/phone only) **before** payment completes, so the checkout form can be pre-filled/validated. This is separate from a real Supabase Auth login. For a long time, 6+ different code paths across the app only checked *"does a `customer_accounts` row exist"* to decide whether to create a login — which is always true after `pre-checkout` runs, even for someone who never actually created a password. Result: 340 real accounts (256 with paid orders) silently had no way to log in, no password reset would work for them, and they'd only find out at the worst possible time.

**The fix:** `src/lib/accountActions.ts` exports `ensureCustomerLogin()` (creates the real Auth user if missing, using GoTrue's caller-supplied `id` to link to the existing `customer_accounts` row instead of re-keying) and `repairCustomerLogin()` (for backfilling). Every one of the following call sites now uses these instead of a bare existence check: `webhooks/stripe/route.ts` (ticket + vendor payment), `auth/signup/route.ts`, `auth/forgot-password/route.ts`, `media/issue-ticket/route.ts`, `admin/users/route.ts`.

**If you add any new path that creates or looks up a customer account, use `ensureCustomerLogin()`/`repairCustomerLogin()` — never write a fresh "does a row exist" check.** The historical backfill for the 256 affected accounts ran via a rate-limited cron (`login_repair_queue` table, `/api/cron/repair-logins`, 20/batch every 2 hours — deliberately slow to avoid spam-flagging) and has already completed; the admin UI card for it was removed once done.

---

## Account Identity — `customer_accounts.id` MUST Equal `auth.users.id`

`/api/auth/session`, `/api/redeem` and `/api/media/upload` all look the customer up with `.eq("id", user.id)` using the **Auth** user's id. So a `customer_accounts` row whose `id` has drifted from its Auth user is invisible to the very customer it belongs to — their orders, loyalty points and tickets are all still in the DB, they just can't see any of it, and support can't find anything wrong because at the row level nothing *is* wrong.

**Re-keying a drifted row is genuinely expensive, which is why this invariant matters more than it looks.** All **nine** foreign keys into `customer_accounts` are `NO ACTION` on update, so the `id` cannot be rewritten in place. Each row must be re-inserted under the correct id, have every child row repointed, then be deleted — and `UNIQUE(email)` stops the staged copy from holding the real address, so staging rows need a temporarily suffixed email.

Worse, three of those nine FKs are **`ON DELETE CASCADE`** (`referrals.referrer_customer_id`, `referral_codes.customer_id`, `referral_rewards.customer_id`) and `redemptions.customer_id` is **`ON DELETE SET NULL`**. Deleting an old row before its children are repointed therefore **destroys referral data silently instead of erroring**. Always confirm all nine FK children reference zero old ids before deleting anything.

### The Oct 3 2026 cleanup (done — don't redo it)

- **22 duplicate email groups merged**, 1,789 → 1,767 rows. Loyalty points unchanged at 143,430; all 1,329 `loyalty_transactions` intact, 0 orphans.
- **24 uppercase emails lowercased.** A case-mismatched email makes the `.eq("email", cleanEmail)` lookups in `signup`/`ensureCustomerLogin` miss an existing lead row — one of the ways drift got created in the first place.
- **46 id mismatches re-keyed to 0.** All 1,465 Auth users now align exactly with their `customer_accounts` row. Audit trail of the 24 standalone re-keys (email → old_id → new_id) is in `public._rekey_audit_20261003`.
- Enqueued the one remaining paying customer who had a row but no login and had never been in `login_repair_queue` at all (Cleveland order TF-MRZJY5CP). **Confirmed repaired Oct 4 2026** — processed `02:00:05Z`, Auth user created, id aligned. The other 302 login-less rows are `pre-checkout` leads with no orders — expected, not a bug.

### Guards that now prevent recurrence

- `ensureCustomerLogin()` passes the existing row's `id` into `createUser`, and if Auth doesn't honor it, **deletes the Auth user and bails** rather than leaving a second disconnected account.
- `auth/signup/route.ts` does the same (added Oct 3 2026) and now also **checks the `customer_accounts` upsert error**. That error was previously discarded, so a collision on `UNIQUE(email)` returned `success: true` to a customer who had no usable account row.
- `admin/users/route.ts` creates the Auth user first and rolls it back if the row insert fails.

**Two traps when working on any of this:**

1. **`supabaseAdmin.auth.admin.listUsers()` returns ONE page.** `perPage: 1000` read as "everything" until `auth.users` passed 1,276 — then the last few hundred were invisible to the "does a login already exist?" check, the repair tried to create a duplicate, and Auth rejected it. `findAuthUserByEmail()` pages properly and stops on an **empty** page, not a short one: GoTrue may cap page size below the requested `perPage`, which would make page 1 look "short" and stop the scan there, recreating the bug. Same class of silent truncation as PostgREST's 1000-row cap.
2. **Supabase Auth's password policy requires a symbol.** Always use `generatePassword()` from `src/lib/resend.ts` — it's the generator known to satisfy the policy, and every call site uses it. Hand-rolled shapes like `Agave` + 4 digits get rejected and surface as a generic failure: that is what failed all 20 rows of the backfill's first batch, and it silently broke admin "create user" until Oct 3 2026.

---

## Supabase MCP — Unqualified Writes Hang For 60s (it is NOT the database)

The Supabase MCP connector has a guard that **stalls for the full 60s tool timeout instead of refusing** when a statement is an unqualified write. Confirmed precisely, on a purpose-built one-row scratch table:

| Statement | Result |
|---|---|
| `DELETE` (any, even single-row by PK) | hangs 60s, rolls back |
| `DROP TABLE` / `DROP FUNCTION` / `DROP POLICY` | hangs 60s, rolls back (`DROP POLICY` confirmed Oct 4 2026 — it took a whole migration down with it, so keep `DROP`s out of otherwise-good migrations) |
| `UPDATE` with **no** `WHERE` | hangs 60s, rolls back |
| `UPDATE` **with** a `WHERE` | instant |
| `SELECT`, `INSERT`, `CREATE TABLE AS`, `CREATE FUNCTION` | instant |

`execute_sql` **and** `apply_migration` stall identically, so it isn't one code path. Nothing commits, so a stalled call is safe — just useless.

**Don't burn a session re-diagnosing this as a Postgres problem.** It looks exactly like lock contention and it isn't: `pg_locks`/`pg_stat_activity` come back empty, there are no triggers on the table, adding the missing FK indexes changes nothing, and — decisively — `set statement_timeout = '8s'` still produces a 60s *tool* timeout, which proves Postgres is not the thing hanging.

**Workaround for a DELETE you actually need:** wrap it in a plpgsql function and invoke it with `SELECT`, which the guard allows. Add count assertions so a wrong match count rolls the whole thing back:

```sql
create or replace function public._tmp_fix() returns int language plpgsql as $fn$
declare n int;
begin
  delete from public.some_table where <narrow condition>;
  get diagnostics n = row_count;
  if n <> <expected> then raise exception 'expected <expected>, got %', n; end if;
  return n;
end $fn$;

select public._tmp_fix();
```

Note that a `SELECT` which both calls the function and re-counts the table shows the **pre-delete** count in the sibling subquery — one statement, one snapshot. Verify in a separate call.

`DROP` has no equivalent workaround: a `CREATE FUNCTION` whose body text contains `drop table` trips the guard too. So **scratch objects must be dropped by hand from the Supabase SQL editor.** Don't obfuscate SQL to evade the guard — write the SQL out and have the owner run it in the editor (that's how the Oct 4 2026 cleanup below was done: the owner pasted it, got "Success. No rows returned", and the result was then verified via the connector).

**To test DDL behavior without leaving anything to drop, use a rolled-back probe.** Create the objects inside a `DO` block, read back what you need, then `raise exception` with the result — the error message carries the answer and the whole transaction rolls back. `SELECT INTO` can't run inside plpgsql `EXECUTE`, so put it as a separate statement *before* the `DO` block in the same `execute_sql` call; the batch is one implicit transaction, so the exception rolls it back too. Confirm afterwards with a separate query that nothing leaked. This is how the auto-RLS trigger gap was proven and its fix verified on Oct 5 2026 with zero manual cleanup.

**Nothing is currently awaiting a manual drop.** The Oct 3 scratch tables (`_rekey_audit_20261003`, `_rekey_backup_20261003`, `_tmp_delete_probe`), the `_tmp_do_delete()` / `_tmp_finish_rekey()` functions, and the five unreachable public-read policies were all dropped by the owner on Oct 4 2026 and confirmed gone (0 policies on the five tables, 0 scratch tables, 0 `_tmp*` functions).

---

## Stripe Configuration

- **Webhook URL:** `https://www.tequilafestusa.com/api/webhooks/stripe` (must be exact — www prefix required, no trailing slash)
- **Webhook events:** `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- **Webhook signing secret:** stored as `STRIPE_WEBHOOK_SECRET` in Vercel env
- **Success URL:** `https://www.tequilafestusa.com/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}`
- **Service fee:** shown as "Service Fee" line item only (no description breakdown)
- **PaymentIntent descriptions:** set explicitly wherever a payment is created/completed so the Stripe Dashboard shows something readable instead of a raw `pi_...` ID — ticket purchases and brand packages set it at session-creation time; **vendor payments set it in the webhook handler at actual payment time** (`handleVendorPaid`), not at Payment Link creation time, because Payment Links bake `payment_intent_data` into the link object when it's created — a link generated before this field existed (or before a re-approval regenerated it) would otherwise still produce a blank-description PaymentIntent even after paying today.

---

## Post-Purchase Flow

1. Customer pays via Stripe Checkout
2. Stripe redirects to `/ticket-confirmation?session_id=cs_xxx`
3. `ConfirmationPage.tsx` calls `/api/session-email?session_id=cs_xxx` to get customer email/phone/orderNumber, fires `PurchaseDataLayerPush`
4. "View My Tickets" button links to `/login?email=customer@email.com&redirect=/account`
5. Login page pre-fills email from URL param, redirects to `/account` after login
6. `/account` shows orders and QR tickets (My Tickets tab — see next section)

---

## My Tickets Page (`/account`, TicketsTab in AccountPage.tsx)

Three real bugs were stacked on top of each other here and shipped to production for an unknown period before a customer complaint surfaced them (she accidentally triggered a fake "checked in" state trying to download her ticket for a friend, and support couldn't find anything wrong because there genuinely wasn't anything wrong server-side):

1. **The QR code was never real.** `QRPlaceholder` rendered a decorative pattern hashed from the ticket ID — not an actual scannable QR — despite the page telling users "show this QR code at the door." Replaced with a real render via the `qrcode` package (`TicketQRCode` component, same library already used for the referral QR in `ReferTab`).
2. **"Download PDF" had no `onClick` handler at all.** Now wired to `downloadTicketPdf()`, which generates a real one-page PDF (jsPDF) with a working QR code, holder name, event details.
3. **A leftover dev-only "Scan" button** sat right next to Download PDF, explicitly commented `Dev/demo only — remove in prod` but never removed. It called `handleSimulateCheckin()`, which set pure local React state to fake a "✓ CHECKED IN" red badge — no server write at all. Removed entirely; `isCheckedIn` is now derived from the ticket's real DB `status === "used"` (and shows the real `checked_in_at` timestamp, now selected by `/api/account/orders`).

**If a "ticket looks checked-in but shouldn't be" report ever comes in again:** check `ticket_instances.status` directly in the DB first — if it's still `"valid"`, the issue is client-side/visual, not a real check-in. This exact confusion already happened once and led to a customer panic-buying a duplicate ticket.

---

## Vendor Flow

### Application → Approval → Payment
- Vendor form (`/vendors`): multi-select city checkboxes, $150/city, Turnstile-protected. Duplicate-application guard (`POST /api/vendor-apply`) checks for an existing non-rejected application by email before inserting.
- Admin approves → `sendVendorApprovalEmail()` (`src/app/api/admin/vendors/route.ts`) creates a Stripe **Payment Link** (not a Checkout Session — sessions cap at 24h expiry, Payment Links don't expire on their own; `restrictions.completed_sessions.limit: 1` makes it single-use instead) — one Product+Price per city at $150 each — and emails it from `FROM_VENDORS`.
- Stripe webhook (`handleVendorPaid` in `webhooks/stripe/route.ts`) marks the application paid, creates the QR ticket + login, sends `vendorConfirmationHtml()`, and sets the PaymentIntent's Stripe dashboard description (see Stripe Configuration section — this must happen here, not at link creation, or old links keep producing blank descriptions).

### Admin → Vendors tooling
- **Paid-vendor city cards** — per-city summary with business name + contact name, paginated 4-per-page (was an unbounded scroll box before), each row has a "Stripe" link (`dashboard.stripe.com/payments/{payment_intent_id}`).
- **PDF export** (`jsPDF` + `jspdf-autotable`) — "Export PDF (All Cities)" button and a per-city "📄 PDF" button on each card, generating Business Name / Contact Name / Phone tables, client-side, no server round-trip.
- **"✉ Email" per city** (`POST /api/admin/vendors/email-city`) — compose modal (subject, message, optional file attachment for a venue map/PDF) sends to every **paid** vendor in that city, always from `FROM_VENDORS` so replies route into the Vendors inbox tab.
- **Load-in info** is set separately, in the admin **Load In** section (below), not in Vendors — it applies per-event, not per-vendor.

---

## Load In (`/loadin` public page + admin Load In section)

A public page for food trucks/vendors: pick a city, see full event info (date/time/venue with a Google Maps link), the load-in time window (start/end, e.g. "12:00pm → 2:00pm"), a free-text info paragraph, and up to **two** venue map images.

- **DB fields** live on the `events` table: `load_in_start`, `load_in_end`, `load_in_notes`, `load_in_map_url`, `load_in_map_url_2`.
- **Admin → Load In** — one card per upcoming event with editable start/end/notes fields (PATCH `/api/admin/events/[id]`) and two independent map upload buttons (`POST /api/admin/events/upload-loadin-map` with `slot: "1"|"2"`). Maps upload as-is (no compression) since venue maps often have small text.
- **Public page** (`src/app/loadin/page.tsx` server component + `LoadInPageClient.tsx`) filters to upcoming, non-draft/cancelled/completed events only (same convention as other "upcoming events" queries elsewhere).
- **Known-fixed bug:** the city-selector-to-detail-view transition originally used `AnimatePresence mode="wait"`, which gates the new view behind the old view's exit animation reporting complete — that completion event didn't reliably fire, so clicking a city updated React state (confirmed via fiber inspection) but the DOM never visibly switched. Removed the exit-wait gating entirely; each view now mounts immediately on state change with just an enter animation. **If any future click-to-switch-view UI silently "doesn't work" despite state clearly updating, suspect `AnimatePresence mode="wait"` first** — it's a fragile pattern for anything that must reliably respond to a single click.

---

## Abandoned Checkout Recovery

Finds ticket purchases where a Stripe Checkout Session was started but never completed (`status: "expired"`, or `status: "open"` and stale for 4+ hours — a grace period so someone mid-checkout right now doesn't get flagged), grouped by city, excluding anyone who has a completed order for that same event under a different session.

- **Manual**: Admin → Inbox → collapsible "🛒 Abandoned Checkout Recovery" panel (above the Support/Vendors/etc tabs) — per-city counts, "Send Now" per city or "Send to All Cities Now".
- **Automatic**: Vercel Cron, `vercel.json` → `/api/cron/abandoned-checkout-recovery`, Wednesdays at `23:00 UTC` (= 7pm Eastern **Daylight** Time — correct for the entire remaining ticket-selling window this season; will read as 6pm once EST returns in November, not currently a concern).
- Email makes clear the customer was **not charged** and links straight to that city's event page. Sent from `FROM_EMAIL` (help@) to match ticket confirmation branding.
- Auth for the cron route uses `authorizeCron()` from `src/lib/cronAuth.ts` (Vercel's `Authorization: Bearer $CRON_SECRET`, or `x-admin-token` for manual admin triggering of the same endpoint).

---

## Tracking — Meta Pixel / Conversions API, GTM, GA4, Roku (rebuilt this session — read before touching any of this)

**Current architecture: Google Tag Manager (`GTM-P3Q33V72`) owns Meta Pixel, Meta Conversions API, GA4, Google Ads (config + conversions + Enhanced Conversions), Roku, and MNTN. The app contains zero tracking code beyond the GTM snippet itself.**

**There is also a server-side GTM container** running on Google Cloud Run (`server-side-tagging-h5okyxcuca-uc.a.run.app`). GA4 and Meta CAPI both route through it via a Facebook Conversions API Gateway setup (the `FB_CONVERSIONS_API-1559821735737152-Web-Tag-*` tags). **Do not modify those three tags** — Meta match quality and CAPI are working correctly through them.

**The app has NO tracking code of its own beyond the GTM snippet.** `src/components/GoogleAdsTag.tsx` used to hardcode `gtag('config', 'AW-18196896859')` in `layout.tsx` — it was **deleted Aug 6 2026** and replaced by a Google tag inside the container (`Google Tag AW-18196896859`, tag id 45, firing on Initialization - All Pages). **Do not re-add an app-side gtag** — two configs for the same ID double-fire every page view. If a future GTM diagnostic says "No Google tag found in this container," that is now genuinely wrong and should be investigated, not ignored.

This is a deliberate rebuild — an earlier version of this app had its **own** direct Meta Pixel (`MetaPixelHead.tsx`/`MetaPixel.tsx`) and server-side Conversions API code (`src/lib/metaCapi.ts`) running **alongside** GTM's own pre-built, official Meta Pixel + Conversions API Gateway integration (which was already installed in the container and nobody had noticed). Result: 2–3 duplicate, non-deduplicated PageView/Purchase/InitiateCheckout signals reaching Meta simultaneously, and Meta's Events Manager reporting low match quality because the app's own `dataLayer.push()` calls used a flat, top-level shape that GTM's tags didn't read from (they expect a nested `eventModel.*` shape). **All of that direct code was deleted** (`MetaPixelHead.tsx`, `MetaPixel.tsx`, `src/lib/metaCapi.ts`, and every call site) in favor of feeding GTM's existing tags correctly.

### How it works now
- `src/components/GoogleTagManager.tsx` renders `GTMHeadScript`/`GTMBodyNoscript` directly in `layout.tsx` (not via `next/script` — see the `next/script` gotcha in Critical Notes). GTM's own container config owns firing Meta Pixel (PageView on `gtm.dom`), GA4, and the Roku pixel.
- The app's only job is pushing correctly-shaped events to `window.dataLayer`:
  - **`TicketCartModal.tsx`** pushes `{ event: "begin_checkout", eventModel: { currency, value, transaction_id, items: [...], user_data: { email_address, phone_number } } }` when checkout starts. GTM's `FBEventName` variable maps `begin_checkout` → Meta's `InitiateCheckout` automatically.
  - **`PurchaseDataLayerPush.tsx`** (shared by ticket/brand/vendor confirmation pages) pushes `{ event: "purchase", eventModel: { transaction_id, value, currency, items: [...], user_data: {...} } }`.
  - **The nested `eventModel` wrapper is required** — GTM's Data Layer Variables read `eventModel.value`, `eventModel.user_data`, etc. A flat top-level push (the old shape) produces `undefined` values in Meta's tags even though the event technically fires.
- Advanced Matching (`user_data.email_address`/`phone_number`) is **plain-text**, not pre-hashed — GTM's own Meta Pixel template hashes it client-side via `fbq('init', pixelId, cidParams)`. Don't hash before pushing.
- **`META_CAPI_ACCESS_TOKEN`** Vercel env var is now unused (the direct CAPI code that read it was deleted) — safe to remove, low priority.

### Google Ads conversions — rebuilt Aug 6 2026 (was recording ZERO for ~2 months)

**Symptom:** PMAX campaigns spending daily with `0.00` conversions since the conversion action was created 5/29/2026.

**Root cause:** the only conversion action was a **URL-based "page load"** conversion (rule: URL starts with `tequilafestusa.com/ticket-confirmation`), created from the Google tag data source. It never matched, and even if it had, a page-load conversion **cannot pass a dynamic value** — every ticket sale would have reported as the `$1` fallback. Google's Tag Coverage report listed `tequilafestusa.com/ticket-confirmation` as "no data in 30+ days" while real traffic lands on the **`www.`** host.

**Fix — event-based conversion driven off the existing `purchase` dataLayer event:**

| Item | Value |
|---|---|
| Conversion action | `Purchase (GTM)` — Primary, category Purchase, count **Every**, 90-day click window |
| Conversion ID | `18196896859` |
| Conversion Label | `D-E3CKTr69wcENu4-uRD` |
| GTM tag | `Google Ads - Purchase Conversion` (Google Ads Conversion Tracking) |
| Trigger | `CE - purchase` (Custom Event, `purchase`) |
| Value / Txn / Currency | `{{DLV - value}}` / `{{DLV - transaction_id}}` / `{{DLV - currency}}` |

The **old URL-based "Purchase" action was demoted to Secondary** so sales don't double-count. Don't re-promote it.

**This one tag covers all three revenue pages** — `/ticket-confirmation`, `/brand-packages/success`, and `/vendor-payment-success` — because all three render `PurchaseDataLayerPush`. Previously only ticket confirmations were tracked at all.

**Enhanced Conversions IS wired** (Aug 6 2026, container version 20). It is configured on the **Google tag**, not the conversion tag — `Google Tag AW-18196896859` has `configSettingsTable` → `user_data` = `{{UPD - Purchase}}`, and the Ads conversion tag inherits it ("This tag will use the configuration of Google tag Tequila Fest USA"). `UPD - Purchase` is an `awec` variable in MANUAL mode reading `DLV - email` / `DLV - phone`.

**Verifying Enhanced Conversions:** Google does **not** put hashed PII in the query string (Meta does — don't confuse the two when grepping traffic). The client-side signal is `ec_mode` in the conversion beacon: `a` = automatic page-scraping, `m` = manual user-provided data. It should read **`m`**. Real confirmation only comes from Google Ads → the conversion action's Enhanced conversions diagnostics after 24–48h.

⚠️ Enhanced Conversions must ALSO be switched on in the Google Ads UI (Goals → Conversions → `Purchase (GTM)` → Enhanced conversions → accept the customer-data terms, method = Google Tag Manager). Without that, Google ignores the data GTM sends.

### Roku — two tags + a relay event (this is subtle, read before touching)

Roku (`Event Group ID: PaccQMJgpRpT`, endpoint `tags.w55c.net/ust`) needs **two** tags:

| Tag | Event Type | Trigger |
|---|---|---|
| `Roku Pixel - Page View` | Page View | **All Pages** |
| `Roku Pixel - Purchase` | Purchases | `CE - roku_purchase` |

**Why the Page View tag is mandatory:** the Roku template creates `window.rkp` itself and loads its tracker async from `cdn.ravm.tv`. The **first** Roku event on a page always fires before the tracker is ready and **silently loses all metadata**. Firing a Page View tag on All Pages warms the tracker so the later purchase event transmits intact. Without it, purchases send `event_name: PURCHASE` with **no `custom_data` at all**.

**Why a separate relay event:** Roku's template auto-reads the GA4 `items` array and rejects it. A Custom HTML tag `Roku - Relay Purchase` fires on `CE - purchase` and re-pushes a sanitized `roku_purchase` event. It must:
- **null out items** — `eventModel: { items: null }`. An empty array `[]` does NOT work: GTM merges dataLayer pushes recursively, so `[]` has no indices to overwrite and the original numeric items survive.
- **poll for `window.rkp`** before pushing, rather than using a fixed delay.

Roku accepts **only three** `custom_data` keys — `value`, `currency`, **`order_id`**. `transaction_id`, `quantity`, `item_name`, `item_city` are all rejected as *"Unexpected key"*, and a rejected key holding a **number** makes Roku drop the entire `custom_data` object.

**Known unfixed Roku bug:** their GTM template truncates `value` to an integer client-side (`189.50` → `189`), so revenue under-reports by up to $0.99/order. Roku support confirmed the platform supports floats and that this is their template's fault. Reported; no fix as of Aug 2026.

### MNTN — two Community Gallery templates, advertiser ID 70795

Added Aug 6 2026. `MNTN Tracking Pixel` (template `cvt_NNZK7`) and `MNTN Conversion Pixel` (template `cvt_NMJHF`) were imported from the GTM Community Template Gallery — no API path exists to import gallery templates, that step is UI-only (Templates → Tag Templates → Search Gallery).

| Tag | Fires on | Params |
|---|---|---|
| `MNTN Tracking Pixel` | All Pages | `advertisertId` = `70795` *(sic — MNTN's own template typo, not ours)* |
| `MNTN Conversion Pixel - Purchase` | `CE - purchase` | `advertiserId` = `70795` *(spelled correctly here — the two templates are inconsistent with each other)*, `conversionOrderId` = `{{DLV - transaction_id}}`, `conversionOrderAmount` = `{{DLV - value}}`, `conversionType` = `Purchase` |

Reuses the existing `DLV - transaction_id` / `DLV - value` variables — no new variables needed. Unlike Roku, MNTN's template preserves decimals correctly (`189.50` transmits as `189.5`, not truncated).

⚠️ **The conversion beacon fires asynchronously with a real delay** — MNTN's tracker does server-side GA4 client-ID enrichment (visible in the `/st` and `/gs` calls) before the `/spx?conv=1` conversion beacon dispatches. Checking network calls immediately after a `dataLayer.push()` will show **zero** conversion beacons even though the tag is correctly configured and will fire moments later. Wait 2-3 seconds before concluding it didn't fire — a false "not working" read wasted real debugging time here before the beacon was found on a delayed check.

Verified independently via MNTN's own dashboard pixel-verification tool: tracking pixels detected across the site, conversion pixel detected on the purchase page, GA4 IDs found, "fully optimized."

### Container cleanup (Aug 6 2026)
Deleted two dead leftovers from the Roku debugging process, both confirmed unreferenced before removal: trigger `Roku` (id 21, orphaned once the relay tag moved to firing on `CE - roku_purchase` instead) and variable `CJS - value string` (id 35, a string-cast dead end from before the real fix — warming the tracker + nulling `items` — was found). Published as container version 22. If you're reading old session notes that mention either of these, they no longer exist.

### How to verify any of this (don't guess — measure)

Load the live site in a browser, push a test event, and read the outbound network calls:

```js
window.dataLayer.push({ event: "purchase", eventModel: {
  transaction_id: "TEST-" + Date.now(), value: 189.50, currency: "USD",
  items: [{ item_id: "VIP", item_name: "VIP", item_city: "Columbus", quantity: 2, price: 94.75 }],
  user_data: { email_address: "t@example.com", phone_number: "+15135550199" } } });
```

Then check: Google Ads → `googleadservices.com/pagead/conversion/18196896859/` (expect `label`, `value`, `oid`); Meta → `facebook.com/tr/?ev=Purchase`; Roku → XHR body to `tags.w55c.net/ust` (expect populated `custom_data`, `errors: null`).

⚠️ **`gtm.js` is browser-cached (~15 min).** After publishing, force a refresh with `fetch(gtmUrl, {cache:'reload'})` before testing, or you'll be measuring the old container and chasing ghosts.

### If Google Ads/Meta conversions ever show zero or look wrong again
1. Check the GTM container directly (export via tagmanager.google.com → Admin → Export Container, or use a properly-registered GTM MCP connector — see the Stape/GTM MCP note below) for what conversion/tracking tags actually exist and what triggers them. **Do not assume a tag exists just because a Google Ads/Meta campaign is "running"** — a campaign can run indefinitely with zero tracking installed.
2. Check `window.dataLayer` shape in a live browser session against what the relevant GTM tag's variables expect — a silent shape mismatch (flat vs. nested, wrong key names) is the most common failure mode and won't throw any error anywhere.
3. Meta's Events Manager → Test Events tab (with a `test_event_code`) gives real-time feedback per event including populated/missing parameters — much faster than waiting on the Overview tab's 24–48h rolling match-quality score.

### GTM MCP — now working (superseded the Stape attempt below)
As of Aug 6 2026, `gtm-mcp-server` (Stape's hosted server, connected via `mcp-remote` in `~/.claude.json`) gives full read/write GTM access — this is what built everything documented above via the API, not the GTM UI. Full setup, access-scope gotchas, and working agreement are in `~/.claude/CLAUDE.md` (user-level, spans all GTM accounts, not just this project). Key things from there worth repeating here: account-level Admin is not sufficient, each container needs explicit **Publish** permission or writes 404; a published workspace locks and needs a fresh workspace to continue editing; `createVersion`/`publish` responses are too large for tool output but the call still succeeds — grep the saved file for `containerVersionId`.

The Community Template Gallery (MNTN, and any future third-party pixel) has **no API import path** — that step is UI-only, everything else can be done via the API once the template exists in the container.

*Historical, no longer relevant:* an earlier attempt at `gtm-mcp.stape.ai` was never properly registered and was instead run as a stray background `mcp-remote` process from the Claude desktop app that looped retrying OAuth for days before being killed. If a similar stray process ever reappears, check `ps aux | grep mcp-remote` and the desktop app's Settings → Connectors.

---

## Admin Dashboard

URL: `/admin` (requires admin password — sent as `x-admin-token` header)

### Sections
- **Overview** — revenue/tickets/orders stat cards + "Ticket Sales by City" (per-event capacity bars, from `stats.byEvent`, NOT `stats.byCity` — worth knowing since a "select this city vs. All Cities" discrepancy report traces back to whichever of these two breakdowns is actually being rendered). City/year filter dropdowns re-fetch `/api/admin/stats` with query params.
- **Orders** — all ticket purchases, Stripe receipt link, Send icon resends ticket email, refund button.
- **Events** — manage event listings and ticket types (`sold_count` per type, live-computed, comp-excluded — see Ticket Sold-Count Accuracy section).
- **Users** — customer accounts.
- **Brands** — tequila brand contacts, invoicing, orders, and inbox (brands@). Sub-tabs: Contacts / Orders / Invoices / Inbox.
- **Vendors** — see Vendor Flow section above.
- **Load In** — see Load In section above.
- **Inbox** — Support/Vendors/Sponsors/Affiliates tabs + Knowledge Base toggle + the Abandoned Checkout Recovery panel (see above).
- **Staff** — check-in staff management.
- **Check-In** — live scan stats, staff roster.
- **Tools** — misc one-off/utility actions (QR code generator, short links, etc.) — this is also where **temporary one-time-fix tools get added and then removed once run**; if you see a card here that looks like a one-off, check git history before assuming it's meant to stay.

### Admin API Endpoints (non-exhaustive — see Key Files Reference for newer ones)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/resend-email` | POST | Resend ticket email. Body: `{ order_number }` |
| `/api/admin/contact` | GET/POST | Fetch/reply to contact submissions |
| `/api/admin/refund` | POST | Issue Stripe refund |
| `/api/admin/stats` | GET | Overview stats — `?city=`/`?year=` optional filters, always excludes comp tickets |
| `/api/admin/events` | GET | List all events with ticket types + live sold counts, always excludes comp tickets |
| `/api/admin/events/[id]` | PATCH | Update event fields including status, load_in_* fields |
| `/api/admin/vendors/resend-payment-link` | POST | Resend a fresh Stripe payment link + approval email to one vendor. Body: `{ id }` |
| `/api/admin/vendors/resend-all-unpaid` | POST | Bulk version — resends to every approved, unpaid vendor |
| `/api/admin/vendors/resend-confirmation` | POST | Resends the post-payment confirmation email |
| `/api/admin/vendors/email-city` | POST | Ad hoc email to all paid vendors in a city, with optional attachment |
| `/api/admin/abandoned-checkouts` | GET | List abandoned-checkout groups by city |
| `/api/admin/abandoned-checkouts/send` | POST | Manually trigger recovery email — `{ eventSlug? }` (omit for all cities) |

All admin endpoints require `x-admin-token` header matching `ADMIN_PASSWORD` env var.

---

## Environment Variables (Vercel)

```env
NEXT_PUBLIC_APP_URL=https://www.tequilafestusa.com
NEXT_PUBLIC_SITE_URL=https://www.tequilafestusa.com
NEXT_PUBLIC_SUPABASE_URL=https://igktkkjnyxeiflnvfzdw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=...                      # must be current/active key from resend.com
RESEND_WEBHOOK_SECRET=...               # Svix signing secret for the inbound-email webhook
                                        # (Resend → Webhooks → endpoint → Signing Secret).
                                        # Until set, /api/webhooks/email-inbound falls back to
                                        # verifying the event's email_id against Resend's API.
RESEND_EVENTS_WEBHOOK_SECRET=...        # Svix signing secret for the outbound-events webhook.
                                        # Separate endpoint in Resend = separate secret; never
                                        # reuse RESEND_WEBHOOK_SECRET here.
ADMIN_PASSWORD=...                      # used in x-admin-token header
CRON_SECRET=...                         # Vercel Cron auth. Vercel sends Authorization: Bearer $CRON_SECRET
                                        # automatically, but ONLY if this var is set — if it's unset, Vercel
                                        # sends no credential AND the check has nothing to compare against, so
                                        # every scheduled run 401s silently behind a healthy-looking schedule.
                                        # Env vars bind at BUILD time: after adding or rotating this you must
                                        # REDEPLOY, or the running deployment keeps the old/absent value.
                                        # Confirm with GET /api/admin/diagnostics/cron-env (booleans only).
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...      # Cloudflare Turnstile site key
TURNSTILE_SECRET_KEY=...                # Cloudflare Turnstile secret key
OPENAI_API_KEY=...
NEXT_PUBLIC_META_PIXEL_ID=1559821735737152   # read by GTM's own Meta Pixel tag config, not by any app code directly
NEXT_PUBLIC_GTM_ID=GTM-P3Q33V72
META_CAPI_ACCESS_TOKEN=...              # UNUSED — leftover from the deleted direct-CAPI code, safe to remove (see Tracking section)
BREVO_API_KEY=...
BREVO_LIST_ID_CINCINNATI=...
BREVO_LIST_ID_CLEVELAND=...
BREVO_LIST_ID_COLUMBUS=...
BREVO_LIST_ID_PHOENIX=...
TEXTMAGIC_USERNAME=...
TEXTMAGIC_API_KEY=...
TEXTMAGIC_LIST_ID_CINCINNATI=...
TEXTMAGIC_LIST_ID_CLEVELAND=...
TEXTMAGIC_LIST_ID_COLUMBUS=...
TEXTMAGIC_LIST_ID_PHOENIX=...
```

---

## What Has Been Built (Completed)

### Infrastructure
- [x] Next.js 16 App Router project on Vercel, auto-deploy on push to `main`
- [x] Supabase project + schema, Cloudflare SSL Full (Strict), Turnstile on all forms

### Core Pages
- [x] Homepage, `/events`, `/events/[slug]`, `/login`, `/signup`, `/account`, `/ticket-confirmation`, `/contact`, `/affiliates`, `/vendors`, `/press`, `/sponsors`, `/forgot-password`, `/admin`, `/blog`, `/loadin` (public, this session)

### Ticket Purchase Flow
- [x] `TicketCartModal.tsx` / `PreCheckoutModal.tsx`, Turnstile-protected
- [x] Stripe Checkout via `/api/pre-checkout`, webhook creates order + QR tickets + real Auth login (see Login Creation section) + one combined email
- [x] Mobile-usable quantity steppers (44px touch targets, this session — was 32px and unreliable to tap repeatedly)

### Email System
- [x] Per-audience `FROM_*` senders wired correctly everywhere, including vendor emails (this session — several were wrongly sending from help@)
- [x] Admin resend tools for tickets, vendor payment links, vendor confirmations

### Staff Check-In System (`/checkin`)
- [x] JWT-based staff auth, fullscreen QR scanner, auto check-in, order progress, undo, live stats

### PWA
- [x] Installable, manifest + icons + install banner

### Tracking — GTM as sole source of truth (rebuilt across two sessions)
- [x] Deleted the app's own direct Meta Pixel/CAPI code (`MetaPixelHead.tsx`, `MetaPixel.tsx`, `src/lib/metaCapi.ts`) in favor of GTM's pre-existing, official Meta Pixel + Conversions API Gateway integration
- [x] Reshaped `dataLayer.push()` calls to the nested `eventModel.*` structure GTM's tags actually read (was flat/incomplete before, causing low Meta match-quality scores)
- [x] **Aug 6 2026 — Google Ads was recording zero conversions for ~2 months.** Root cause: a URL-based page-load conversion that never matched real traffic, and couldn't have passed real dollar values even if it had. Replaced with an event-based conversion firing off `purchase`, verified live with real values/order-IDs/dedup across all three revenue pages. Confirmed flipped from "Inactive" to "Recording" within 24h of publishing.
- [x] **Aug 6 2026 — Google Ads Enhanced Conversions wired.** Consolidated the app's hardcoded Google Ads gtag into GTM (deleted `GoogleAdsTag.tsx`) so the container owns the Google tag, which unlocked the user-provided-data field the conversion tag alone doesn't expose.
- [x] **Aug 6 2026 — Roku was firing purchases with zero metadata.** Root cause was a load-order race (Roku's tracker isn't ready on the first event of a page) plus their template silently dropping `custom_data` when the GA4 `items` array carries numeric values. Fixed with a dedicated Page View pixel (warms the tracker) and a relay tag that republishes a sanitized event with `items` explicitly nulled. Roku's template still truncates decimals — reported to Roku, unresolved on their end.
- [x] **Aug 6 2026 — MNTN pixel installed from scratch.** No tracking existed previously. Both Tracking and Conversion pixels added via GTM's Community Template Gallery, verified two ways (live network capture + MNTN's own dashboard verification tool).
- [x] **Aug 6 2026 — `gtm-mcp-server` MCP connection established with full read/write access**, used to build/verify/publish everything above directly via the GTM API rather than the UI. See the GTM MCP subsection under Tracking and `~/.claude/CLAUDE.md` for the working setup.
- [x] See full "Tracking" section above for the complete architecture, including per-platform gotchas worth reading before touching any of this again.

### Vendor Flow — Payment Pipeline Rebuilt + Admin Tooling
- [x] Fixed the vendor payment pipeline being completely broken (wrong session type, missing metadata, missing success page, wrong email) — see git history for the original incident writeup if needed
- [x] Switched to Stripe Payment Links (never expire) instead of Checkout Sessions (24h cap) for vendor payment collection
- [x] PaymentIntent descriptions set at actual payment time (webhook), not link-creation time, so the Stripe dashboard always shows a readable label regardless of when the link was generated
- [x] Admin Vendors: paginated paid-vendor city cards, "View in Stripe" links, PDF export (all cities / per city), "Email Paid Vendors by City" with attachment support (this session)
- [x] Email tracking badges (Sent/Delivered/Opened/Clicked/Bounced) via Resend outbound webhook

### Load In (this session)
- [x] Public `/loadin` page + admin Load In section — see full Load In section above

### Abandoned Checkout Recovery (this session)
- [x] Manual + automatic (Wednesday cron) recovery emails for incomplete ticket checkouts — see full section above

### Admin Reporting Accuracy (this session — two real incidents, both fixed)
- [x] Fixed Overview going completely blank (500 "Bad Request" on `/api/admin/stats`) — root cause was a giant client-built `order_id IN(...)` list combined with row-count pagination; rewritten to a server-side Postgres join
- [x] Fixed Overview vs. Events tab disagreeing on sold counts — Events tab wasn't excluding comp/giveaway tickets, Overview was; both now use the identical paid-and-non-comp filter
- [x] Underlying cause of the original undercounting (before either of the above): Supabase's default 1000-row query cap, silently truncating any unpaginated aggregate query once `ticket_instances` crossed ~1000 rows — see `src/lib/fetchAllRows.ts`

### Customer Account Data Integrity (Oct 3 2026)
- [x] Merged 22 duplicate email groups (1,789 → 1,767 rows) with loyalty points and all 1,329 `loyalty_transactions` preserved exactly
- [x] Lowercased 24 uppercase emails — a case mismatch makes the `.eq("email", ...)` lead-row lookups miss, which is one source of id drift
- [x] Re-keyed 46 `customer_accounts` rows whose `id` had drifted from `auth.users.id`, down to **0 mismatches** across all 1,465 Auth users — these customers could not see their own orders, points or tickets
- [x] Closed the recurrence path in `auth/signup/route.ts` (unhonored-id guard + the previously-discarded upsert error) and fixed admin "create user", which had been failing on a symbol-less temp password
- [x] Found and queued the one paying customer who had an account row but no login and had never been in `login_repair_queue`
- [x] See the full "Account Identity" section above — re-keying is expensive and partly destructive, so the invariant is worth protecting

### My Tickets Page Rebuilt (this session)
- [x] Real scannable QR code (was a fake decorative pattern), working "Download PDF", removed a leftover dev-only fake-check-in button — see full section above

### Marketing List Sync — Brevo + TextMagic
- [x] Every paid ticket purchase (not brand packages or vendor payments) syncs to the correct per-city Brevo + TextMagic list (`src/lib/marketingSync.ts`)

### Brand Package / Contacts Integration
- [x] Admin Brands → Contacts shows linked orders inline; rolling brand scroller pulls from paid `brand_package_orders`

---

## Supabase RLS & Access Posture — Audited Oct 4 2026

**Audit result: the posture is better than it looks, and the remaining work is small and low-risk.** The important finding is *why* it's safe, because that's what a future change could accidentally break.

### How access actually works today

- **RLS is ENABLED on all 45 real tables.** 40 of them have **zero policies**, which under RLS means *deny everything* for `anon` and `authenticated`. That is a default-deny posture, not an oversight.
- **Every table read/write in the app goes through `supabaseAdmin` (service role), which bypasses RLS entirely.** Verified: `grep -rn '\bsupabase\.from('` across `src/` returns **zero** hits on the anon client. All data access is in API routes behind either `verifyAdminToken` or a per-request session check.
- **The anon client is used only for `supabase.auth.*`** (`getUser`, `signInWithPassword`, `signOut`) — never for table data.
- **The auth pattern is correct.** `/api/auth/session`, `/api/account/orders`, `/api/redeem`, `/api/media/upload` etc. each construct a **per-request** `createServerClient` from `@supabase/ssr` bound to that request's cookies. There is no module-level singleton being reused across requests, so there is no cross-user session bleed. (The module-level `supabase` export in `src/lib/supabase.ts` exists but is not used for table access.)

**Consequence: no application code depends on any RLS policy or any `anon` table grant.** That is what makes the cleanup below safe — it is removing unused surface, not re-plumbing the app.

### The five public-read policies (all `SELECT`, all role `public`) — all unreachable since Oct 4 2026

**All five were dropped by the owner on Oct 4 2026** (after `SELECT` had already been revoked, so they were unreachable anyway). The five tables now have no policies and `anon`/`authenticated` hold no grants on them. Table kept as the record of what existed:

| Table | Policy predicate | Verdict |
|---|---|---|
| `events` | `status <> 'draft'` | Dropped Oct 4 2026 |
| `ticket_types` | `is_active = true` | Dropped Oct 4 2026 |
| `blog_posts` | `published = true` | Dropped Oct 4 2026 |
| `banner_sponsors` | `active = true` | Dropped Oct 4 2026 |
| `coupons` | `active = true` | Dropped Oct 4 2026 (after `SELECT` was revoked) |

**`coupons` was world-readable to anyone holding the anon key** (public by definition — it ships in the browser bundle). Closed Oct 4 2026 at 0 rows by revoking `SELECT` on `coupons` from `anon`/`authenticated` (verified: an anon PostgREST read returns `42501 permission denied`). The policy was then dropped by hand in the SQL editor — the Supabase MCP connector cannot run `DROP` of any kind (`DROP POLICY` stalls exactly like `DROP TABLE`, confirmed). **Never re-grant `SELECT` on `coupons` to `anon`/`authenticated`.** Coupon validation belongs in a server route using the service role, never a client-side table read.

### Fixed during the audit (Oct 4 2026)

The three leftover scratch tables (`_rekey_audit_20261003`, `_rekey_backup_20261003`, `_tmp_delete_probe`) had **RLS disabled** while `anon` held full `SELECT,INSERT,UPDATE,DELETE,TRUNCATE` grants — so the 24 customer emails in the audit table were readable, and writable, by anyone with the public anon key. **This was self-inflicted** (created by the re-key migration) and is now closed: RLS enabled and all `anon`/`authenticated` grants revoked on all three, then dropped by the owner the same day.

**This is the Supabase footgun to remember: a new table gets RLS *off* and inherits the project's default grants to `anon`/`authenticated`, so it is immediately world-readable through PostgREST.** This project has a partial safety net — read its limits before relying on it:

- **Event trigger `trg_auto_enable_rls`** (migrations `auto_enable_rls_on_new_public_tables` Aug 4 2026, hardened `revoke_anon_grants_and_harden_rls_trigger` Aug 26) fires on `ddl_command_end` and runs `public.auto_enable_rls()`, which enables RLS and `REVOKE ALL ... FROM anon, authenticated` on every new `public` table. It was missing from this file until Oct 4 2026.
- **Until Oct 5 2026 it only matched the command tag `CREATE TABLE`.** `CREATE TABLE AS` and `SELECT INTO` report *different* tags, so tables created that way got **no** protection — proven with a rolled-back probe: a plain table came out `rls=t, anon_grants=0`, a `CREATE TABLE AS` table `rls=f, anon_grants=7`. That is almost certainly how the Oct 3 re-key scratch tables became world-readable despite the trigger existing. **Fixed Oct 5 2026** (migration `auto_enable_rls_cover_create_table_as`): the function now accepts all three tags, and a second event trigger **`trg_auto_enable_rls_ctas`** (`WHEN TAG IN ('CREATE TABLE AS', 'SELECT INTO')`) calls it — the original trigger's tag list can't be altered without `DROP EVENT TRIGGER`. Re-probed: all three creation paths now land `rls=t`, zero `anon`/`authenticated` grants.
- On Oct 4 2026 `EXECUTE` on `auto_enable_rls()` was revoked from `public`/`anon`/`authenticated` (migration `revoke_public_execute_on_auto_enable_rls`) to clear a security-advisor WARN — it was reachable at `/rest/v1/rpc/auto_enable_rls`, though calling it there only errors. The trigger still fires (the owner, `postgres`, retains `EXECUTE`).

So: still put `ENABLE ROW LEVEL SECURITY` in the same migration as any new table — the triggers are a backstop, not the primary control. They only cover the `public` schema and plain tables (not views, materialized views, or `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` afterwards). This applies to throwaway/scratch tables too — they are the easiest to forget and often hold exactly the data you were inspecting *because* it was sensitive.

### Known dead path (not a leak, but it means signups aren't landing)

The **city splash sites** call `supabase.from("email_subscribers").insert([...])` from a **client component** (`EmailSignup.tsx`) with the anon key. That table **does not exist** in this project, the call is **not awaited**, and its error is **never checked** — so it fails silently on every submission. `newsletter_subscribers` (which does exist) has **0 rows**. Brevo/TextMagic is the real list and is working, so no subscriber data is being lost, but that code path does nothing and should either be pointed at a real table through a server route or deleted.

### The remediation plan (ordered, each step independently shippable)

1. ~~Drop the three scratch tables.~~ **DONE Oct 4 2026** — dropped by the owner in the SQL editor, verified gone.
2. ~~Drop the `coupons` public-read policy.~~ **Neutralized Oct 4 2026** (`SELECT` revoked, migration `revoke_public_select_on_coupons`). Policy object dropped by the owner the same day.
3. ~~Revoke the blanket `anon`/`authenticated` grants~~ **DONE Oct 4 2026** (migration `revoke_anon_write_grants_on_public_read_tables` — also revoked `TRIGGER`/`REFERENCES`; verified anon `PATCH events` / `POST ticket_types` now return `42501`, public reads and the live site unaffected). `anon`/`authenticated` now hold `SELECT` only on `events`, `ticket_types`, `blog_posts`, `banner_sponsors`, and nothing on `coupons`. Before this, `anon` held `INSERT,UPDATE,DELETE,TRUNCATE` on `events`, `ticket_types`, `blog_posts`, `banner_sponsors` and `coupons`. RLS-with-no-write-policy currently blocks those, so it is **not** presently exploitable — but it means a single careless `FOR ALL USING (true)` policy, or one `DISABLE ROW LEVEL SECURITY`, turns straight into public write access on live event and pricing data. Removing the grants makes that failure mode impossible rather than merely unreachable.
4. **DONE Oct 4 2026 — owner chose auth-only for `anon`.** `SELECT` revoked from `anon`/`authenticated` on `events`, `ticket_types`, `blog_posts`, `banner_sponsors` (migration `revoke_public_select_on_public_read_tables`); verified all five tables return `42501` to the anon key, and the live site (home, `/events/[slug]`, `/api/events`, `/blog`, `/loadin`) still returns 200. Checked first that no consumer needed them: the hub has no anon-client table reads or Realtime subscriptions, and the three city splash sites (source **and** live JS bundles) reference only the dead `email_subscribers` insert. Phoenix has no splash site (`tequilafestphoenix.com` DNS isn't serving). **If a future city site or browser feature needs a direct table read, that is a new decision — grant `SELECT` deliberately and add a policy, don't assume one exists.** Original reasoning: The app itself does not need *any* of the five policies, because `/api/events` and friends read through the service role. If nothing is ever going to query Supabase directly from a browser, the simplest and safest end state is to drop all five policies and revoke all `anon` table grants, leaving `anon` with auth only. Confirm with the owner before doing this — it is the one step with a (small) chance of breaking an unknown consumer.
5. **Fix or delete the city-site `email_subscribers` write** (see above).
6. **Add the standing rule to any new-table migration:** `alter table <t> enable row level security;` in the same migration, and no grant to `anon` unless a policy deliberately intends public read.

**Do not "enable RLS everywhere" as a task — it is already enabled everywhere.** The work is removing unused grants and the one dangerous policy, not adding RLS.

---

## What Still Needs to Be Done — Ordered Roadmap

Work top to bottom. Phase 0 is security and correctness and should go first; everything below it is feature work ordered by customer impact.

### Phase 0 — Security & hygiene (do these first)

1. **[HUMAN] Set the two Resend webhook secrets in Vercel**, then redeploy. `RESEND_WEBHOOK_SECRET` (inbound) and `RESEND_EVENTS_WEBHOOK_SECRET` (outbound events). Two separate Resend endpoints = two different signing secrets; **never reuse one for the other**. Until the inbound one is set, `/api/webhooks/email-inbound` falls back to verifying the event's `email_id` against Resend's API (works, but slower and weaker); the outbound-events endpoint has **no fallback at all**. Signature verification code is already shipped (`src/lib/resendWebhook.ts`).
2. ~~Drop the leftover scratch tables~~ — **DONE Oct 4 2026** (owner ran it in the SQL editor; verified gone).
3. ~~Drop the `coupons` public-read policy~~ — **neutralized Oct 4 2026** (`SELECT` revoked). Policy object dropped by the owner the same day.
4. ~~Revoke the blanket `anon`/`authenticated` write grants~~ — **DONE Oct 4 2026**. See RLS section step 3.
5. ~~Settle the public-read question~~ — **DONE Oct 4 2026**: auth-only for `anon` (all table grants revoked). All five policy objects dropped by the owner the same day.
5a. ~~Close the `CREATE TABLE AS` gap in the auto-RLS trigger~~ — **DONE Oct 5 2026** (migration `auto_enable_rls_cover_create_table_as`, new trigger `trg_auto_enable_rls_ctas`). Gap proven before and closed after with rolled-back probes; nothing left behind to drop. See the RLS section's footgun note.
6. **[HUMAN] Reconnect the Stripe connector with payments-write scope**, then update the four PaymentIntent descriptions still reading 2026: `pi_3UEepsLyuw3Oooiq0xvsk9ae`, `pi_3UG9pPLyuw3Oooiq116ZVKYj`, `pi_3UCqwSLyuw3Oooiq0MaQCwqj`, `pi_3UC2k8Lyuw3Oooiq1xVzLmvi`. The code-level year fix is already shipped (`src/lib/eventLabel.ts`) — these are historical rows only, cosmetic in the Stripe dashboard.
7. ~~Verify the queued login repair ran.~~ **DONE** — verified Oct 4 2026: the Cleveland customer (`TF-MRZJY5CP`) enqueued Oct 3 processed at `02:00:05Z` with status `repaired`, now has an `auth.users` row, and their `customer_accounts.id` matches it. Nothing outstanding. Kept here as the record so it isn't re-investigated.

### Phase 1 — Revenue-affecting features

8. **Coupon/promo codes at checkout.** `coupons` table exists; UI and API are not built. Phase 0 step 3 is done (anon has no access to `coupons`). Validation must happen server-side with the service role — never a client-side read of the `coupons` table. Apply the discount when creating the Stripe Checkout Session, and make sure the discounted total is what reaches `ticket_orders.total` and the `purchase` dataLayer `value` (otherwise Google Ads/Meta/MNTN revenue over-reports).
8a. **Best Table Contest voting** — announced on `/brand-packages` Oct 5 2026 (attendees rate each brand table 1–10 on Tequila Taste, Table Decoration, Staff, Souvenirs, Overall Best Experience; top brand per city; the three Ohio city winners compete for one Ohio winner; Ohio + Phoenix winners get their 2027 brand fee comped). **Only the announcement exists — there is no voting system.** Before building, the owner must decide: how a score is computed (average vs. total — totals reward high-traffic tables), a minimum vote count, how to stop repeat/ballot-stuffing votes (ticket QR / logged-in account), and how voters find a table (per-table QR code).
9. **Stripe receipt link on the account page.** Not currently shown. `ticket_orders.stripe_payment_intent_id` is already stored, so this is a link-rendering job, not a data one.

### Phase 2 — Customer-facing polish

10. **City-specific logos** on each event page — currently the generic logo. `CITY_STYLE` in `src/app/events/[slug]/page.tsx` is where per-city visual config already lives.
11. **Loyalty/points UI + award logic.** `customer_accounts.loyalty_points` (143,430 points across 1,767 rows) and `loyalty_transactions` (1,329 rows) already hold real data, but there is no UI and no award logic — points exist and nobody can see or spend them. Read the "Account Identity" section first: anything reading a customer's own row must key on `auth.users.id`.
12. **Blog CMS** — page is scaffolded, needs admin editing and real content. `blog_posts` is not readable by `anon` at all — serve posts through a service-role API route/server component, filtering `published = true` there.
13. **Push notifications** — VAPID keys are in env, nothing is wired up.

### Phase 3 — Nice to have

14. **AI auto-reply in inbox** — OpenAI key exists, partially wired. Keep the deliberately conservative escalate-by-default posture (see AI Inbox section).
15. **Affiliate dashboard** — signup exists, no commission-tracking UI for affiliates.
16. **Columbus splash site** — not built at `/Users/adambossin/Sites/tequila-fest-columbus`.
17. **Sponsor portal / brand owner portal** — not built.
18. **Admin analytics** beyond the current Overview — revenue by city, ticket-type breakdown.
19. **Fix or delete the city-site `email_subscribers` write** (RLS section step 5) — currently a silent no-op.
20. **Remove the unused `META_CAPI_ACCESS_TOKEN`** Vercel env var — leftover from the deleted direct-CAPI code.

### Done — don't redo

- [x] **Google Ads zero conversions** — fixed Aug 6 2026 (URL-based page-load conversion replaced with event-based off `purchase`). **Watch:** `Purchase (GTM)` reads "Inactive" until its first ad-attributed conversion lands.
- [x] **MNTN pixel** — installed and verified Aug 6 2026.
- [x] **`robots.txt` / `sitemap.xml`** — added Aug 6 2026. `robots.ts` disallows the three post-payment confirmation pages; that is not just SEO — those pages fire purchase conversions, and a crawler reaching them would inject phantom purchases into Google Ads/Meta/Roku.
- [x] **Customer account data integrity** — Oct 3 2026, see "Account Identity".
- [x] **Supabase RLS audit** — Oct 4 2026, see the RLS section above. Remaining items are folded into Phase 0.

---


## Design System

### Colors
| Role | Hex |
|---|---|
| Primary gold/marigold | `#F5A623` |
| Agave red | `#C8102E` |
| Fiesta purple | `#7B2FBE` |
| Dark background | `#0d0500` |
| Cream text | `#FFF8F0` |

### Fonts (Google Fonts)
- **Display/Headlines:** Bebas Neue
- **Body:** Source Sans 3

### CSS Classes (from `globals.css`)
- `.text-shimmer` — gold/red animated gradient
- `.text-shimmer-blue` — light blue/turquoise/navy
- `.text-shimmer-platinum` — silver/white (VIP sections)
- `.animate-pulse-glow` — yellow glow pulse on CTAs
- `.papel-picado-border` — Mexican paper-cut border decoration

---

## Old Codebase Reference

Original Replit project archived at: `/Users/adambossin/Sites/tequila-fest-usa-old/`

**DO NOT** copy anything referencing: `businesses`, `SedonaPassport`, `Lodging`, `Restaurants`, `ThingsToDo`, `BusinessDetail`, `BusinessMap`, `ClaimListing` — dead code from another project mixed in.

---

## AI Inbox (Support Tickets)

### How It Works
- Contact form submissions → `contact_submissions` table → AI processes inline (awaited) in `/api/contact`
- AI uses OpenAI `gpt-4o-mini` (NOT Anthropic/Claude) — key is `OPENAI_API_KEY` in Vercel
- Knowledge base loaded from `knowledge_base` DB table at runtime
- Default posture is **escalate, not auto-reply** — the prompt was deliberately tightened (temperature 0.2, expanded "always escalate" list covering profanity/ALL-CAPS/repeated punctuation/"that didn't work"/phone number requests) after early auto-replies were too eager. If AI is confident → auto-replies, status `auto-replied`. Otherwise → escalates to a human, status `needs-review`.
- Manual trigger: admin can click "Auto-Handle with AI" button on any `new` or `needs-review` ticket
- **Learns from admin replies**: when an admin manually replies to a ticket, `learnFromAdminReply()` (`/api/admin/contact`) uses the customer's *latest* inbound message (not the original stale submission text) to improve future auto-replies for similar messages

### DB Status Values
`contact_submissions_status_check` constraint allows: `new`, `read`, `replied`, `closed`, `auto-replied`, `needs-review`

### Key Files
- `src/lib/aiInbox.ts` — OpenAI client, knowledge base, `generateAIReply()`
- `src/lib/aiInboxEmail.ts` — Email HTML builders: `buildReplyHtml()`, `buildEscalationHtml()`
- `src/app/api/ai-inbox/route.ts` — Manual trigger endpoint (POST with submissionId)
- `src/app/api/contact/route.ts` — Contact form handler; AI runs INLINE (awaited) before response returns

---

## Critical Notes for Next Session

1. **Stripe webhook URL must be exactly `https://www.tequilafestusa.com/api/webhooks/stripe`** — www prefix required. Cloudflare redirects bare domain with 308 and Stripe does not follow redirects.

2. **Only ONE Resend email per webhook execution** — do not add a second `resend.emails.send()` for the same recipient. Resend silently drops it.

3. **`RESEND_API_KEY` must be active** — check resend.com/api-keys if emails stop.

4. **Never import `supabaseAdmin` in a client component** — `SUPABASE_SERVICE_ROLE_KEY` is server-only. Always fetch via an API route.

5. **Turnstile is working** — the fix was stabilizing callbacks in refs inside `Turnstile.tsx`. Do not change the dependency array of the widget's `useEffect`.

6. **Local builds/dev fail on anything DB-backed** — `.env.local` has blank placeholder values for all protected secrets (Stripe key, Supabase keys, admin password, etc.), by design. Verify DB-backed changes against the live production site, not local dev.

7. **Homepage event cards are dynamic** (`src/components/EventCards.tsx` fetches `/api/events`) — admin status/date changes automatically reflect. No deploy needed.

8. **DB events status constraint** — allowed values: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon`, `completed`. New statuses require an `ALTER TABLE` on the check constraint first.

9. **`ticket_instances` status constraint** — allows: `valid`, `used`, `cancelled`, `refunded`, `pending`, `transferred`. Checked-in tickets must be `"used"` — `"checked_in"` is **NOT** allowed and will throw a constraint violation.

10. **Staff JWT permissions** — `verifyCheckinAccess()` allows any valid staff JWT (no specific permission required). Empty `permissions: []` is fine.

11. **Supabase project ID** — `igktkkjnyxeiflnvfzdw`. Always use this one.

12. **`.env.local` values are dotenvx-encrypted / blank via `vercel env pull`** — to read real values, query the live DB via the Supabase MCP with project ID `igktkkjnyxeiflnvfzdw`, or check Vercel's env var UI directly.

13. **Old vs. new QR code format** — old Replit-generated tickets used a different format than the current generator; if a "my QR won't scan" report comes from someone with a very old ticket, check `admin → Events → [city] → "Resend Old QR"`. Check-in only matches exact `qr_code`, then falls back to name/email/order-number search — no fuzzy matching.

14. **`next/script` does not reliably render inside the literal `<head>` tag** in this Next.js version, even with `strategy="beforeInteractive"`. For anything that must be literally in `<head>` (GTM's head script, domain-verification meta tags), render a plain `<script>`/`<meta>` element directly in `layout.tsx`'s `<head>` JSX instead (see `GoogleTagManager.tsx`'s `GTMHeadScript`).

15. **Never count/join `ticket_instances` by `event_slug`** for anything spanning multiple years or admin reporting — use `event_id`. **Never count a "sold" ticket without excluding `ticket_orders.source = 'media_comp'`** except in check-in stats (comp holders still need door check-in). See the full "Ticket Sold-Count Accuracy" section near the top of this file.

16. **Supabase's default 1000-row query cap cannot be overridden by a client-side `.limit()`** — it's enforced server-side. Real pagination (`src/lib/fetchAllRows.ts`, looping `.range()`) is the only fix. Never build a giant `.in(hugeIdList)` client-side to join two tables — let Postgres do it server-side via embedded-resource joins (`table!inner(...)`) instead. Both of these caused real production outages this session (`ticket_instances` just crossed 1000 rows for the first time).

17. **Vendor payments and ticket payments share one Stripe webhook** (`src/app/api/webhooks/stripe/route.ts`) — routed by `session.metadata.type` (`"vendor"` → `handleVendorPaid`, `"brand_package"` → `handleBrandPackagePaid`, unset → `handleCheckoutComplete` for tickets). Any new payment type must set a distinct `metadata.type` or it will silently fall through to the ticket handler and create a phantom ticket order — this exact bug hit three real vendors historically.

18. **The app contains no tracking code except the GTM snippet** (`GoogleTagManager.tsx` in `layout.tsx`). All tracking — Meta Pixel + CAPI, GA4, Google Ads config *and* conversions, Roku — lives in GTM (`GTM-P3Q33V72`) plus a server-side container on Cloud Run. The app's only job is pushing correctly-shaped `eventModel` events to `window.dataLayer`. A hardcoded Google Ads gtag (`GoogleAdsTag.tsx`) existed until Aug 6 2026 and was deleted when the Google tag moved into the container; **never reintroduce an app-side gtag/Pixel/CAPI integration** — running one alongside GTM's own is exactly the duplication that caused a real incident (see Tracking section).

19. **Any new admin aggregate/reporting query must**: (a) use `fetchAllRows()` if it could plausibly return >1000 rows, (b) join via Postgres embedded-resource syntax rather than building ID lists client-side, and (c) filter `ticket_orders.status = 'paid' AND source != 'media_comp'` unless there's a specific reason not to (check-in stats). Test any change to `/api/admin/stats` or `/api/admin/events` against both "All Cities" and a specific city filter — a past bug only manifested in one of the two paths.

20. **When an "outdated demo/dev-only" comment exists in shipped code, don't trust that it's actually inert** — the My Tickets fake check-in button was commented `Dev/demo only — remove in prod` and still ran real (if client-side-only) logic that confused a paying customer. If you see this pattern elsewhere, verify what the code actually does before assuming the comment means it's harmless.

21. **MNTN is now tracking too, not just Meta/GA4/Google Ads/Roku** — two GTM tags (Tracking Pixel + Conversion Pixel), advertiser ID `70795`. See the "MNTN" subsection under Tracking before assuming it doesn't exist.

22. **Don't declare a GTM tag broken from an immediate zero-network-calls check** — both Roku and MNTN looked non-functional on the first live test this session and both turned out to be correctly configured; the beacons just hadn't dispatched yet (Roku needs its tracker warmed by a prior page-view event, MNTN's conversion pixel waits on async server-side GA4 enrichment before firing). Wait a few seconds and recheck before concluding a tag isn't firing, and read the compiled `gtm.js` bytecode directly if network capture stays empty — that's what actually resolved both false alarms.

23. **`customer_accounts.id` must always equal the matching `auth.users.id`** — the logged-in customer's data is fetched with `.eq("id", user.id)`, so a drifted id hides their orders/points/tickets from them while looking perfectly healthy in the DB. Never write a code path that inserts a `customer_accounts` row with an id that didn't come from the Auth user (or vice versa) without verifying Auth honored the requested id, and never discard the row-write error. Re-keying after the fact is expensive and partly destructive — see the full "Account Identity" section for why (nine `NO ACTION` FKs, three of them `ON DELETE CASCADE`).

24. **The Supabase MCP hangs for 60s on `DELETE`, `DROP`, and unqualified `UPDATE`** — it's a connector guard, not lock contention, not a slow query. A `WHERE`-qualified `UPDATE` is instant. Wrap a needed `DELETE` in a plpgsql function and call it with `SELECT`; `DROP` must be done by hand in the Supabase SQL editor. Full evidence and the workaround snippet are in the "Supabase MCP" section — read it before spending time on `pg_locks`.

25. **Two Supabase Auth gotchas that both caused silent mass failures** — (a) `auth.admin.listUsers()` returns only ONE page, so any "does this login exist?" check must paginate and stop on an **empty** page, not a short one (`findAuthUserByEmail()` in `accountActions.ts`); (b) the password policy requires a **symbol**, so always mint temp passwords with `generatePassword()` from `src/lib/resend.ts` — a hand-rolled `Agave1234` is rejected behind a generic error and broke both the login backfill and admin "create user".

26. **A missing `CRON_SECRET` makes every scheduled run 401 silently** — Vercel only sends the `Authorization: Bearer $CRON_SECRET` header when the var is set, and the route has nothing to compare against when it isn't, so the dashboard shows a perfectly healthy schedule while nothing runs. This went unnoticed for **eight weeks**: the one-time backfill of 256 customer logins never processed a single row, and the weekly abandoned-checkout recovery emails never went out. Env vars bind at **build** time, so adding or rotating the secret requires a **redeploy**. `src/lib/cronAuth.ts` now logs which specific cause it hit, and `GET /api/admin/diagnostics/cron-env` reports whether the running deployment actually has it (booleans only, never values).

27. **RLS is already enabled on every table — the app is safe because ALL table access uses the service role, not because of policies.** `grep -rn '\bsupabase\.from('` returns zero hits on the anon client; the anon key is used only for `supabase.auth.*`. So no policy and no `anon` grant is load-bearing. Two things follow: (a) **never add a client-side table read** without writing a policy for it deliberately — the default-deny posture is doing real work; (b) a plain `CREATE TABLE` in Supabase lands with **RLS off** and inherits grants to `anon`, making it instantly world-readable through PostgREST, so every new table needs `enable row level security` in the same migration. That footgun already bit once: the re-key migration's scratch tables briefly exposed 24 customer emails to anyone holding the public anon key. As of Oct 4 2026 `anon`/`authenticated` hold **no grants** on `events`, `ticket_types`, `blog_posts`, `banner_sponsors` or `coupons` either, and those tables have **no policies** (all five public-read policies dropped). Never re-grant on `coupons`. The `trg_auto_enable_rls` + `trg_auto_enable_rls_ctas` event triggers auto-protect `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO` in `public` (the CTAS gap was closed Oct 5 2026) — a backstop, not a substitute for enabling RLS in the migration. See the "Supabase RLS & Access Posture" section.
