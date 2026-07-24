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
| `brand_package_orders` | Brand package purchases (self-serve checkout at `/brand-packages`) — order_number, brand_name, contact_name/email/phone, tier (Value/Standard/Premium), cities (JSONB array), amount, stripe_session_id, stripe_payment_intent_id, status (pending/paid), paid_at, **brand_contact_id** (FK — auto-linked/created by the Stripe webhook by matching contact_email) |
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
| `src/lib/adminAuth.ts` | Admin token verification (`verifyAdminToken`/`unauthorizedResponse`) — also doubles as the auth check for Vercel Cron routes via the shared `authorized()` pattern (`CRON_SECRET` bearer token OR `x-admin-token` header) |
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
- Auth for the cron route follows the shared `authorized()` pattern (Vercel's `Authorization: Bearer $CRON_SECRET`, or `x-admin-token` for manual admin triggering of the same endpoint).

---

## Tracking — Meta Pixel / Conversions API, GTM, GA4, Roku (rebuilt this session — read before touching any of this)

**Current architecture: Google Tag Manager (`GTM-P3Q33V72`) is the single source of truth for Meta Pixel, Meta Conversions API, GA4, and Roku. The app itself contains no direct Meta Pixel or CAPI code.**

This is a deliberate rebuild — an earlier version of this app had its **own** direct Meta Pixel (`MetaPixelHead.tsx`/`MetaPixel.tsx`) and server-side Conversions API code (`src/lib/metaCapi.ts`) running **alongside** GTM's own pre-built, official Meta Pixel + Conversions API Gateway integration (which was already installed in the container and nobody had noticed). Result: 2–3 duplicate, non-deduplicated PageView/Purchase/InitiateCheckout signals reaching Meta simultaneously, and Meta's Events Manager reporting low match quality because the app's own `dataLayer.push()` calls used a flat, top-level shape that GTM's tags didn't read from (they expect a nested `eventModel.*` shape). **All of that direct code was deleted** (`MetaPixelHead.tsx`, `MetaPixel.tsx`, `src/lib/metaCapi.ts`, and every call site) in favor of feeding GTM's existing tags correctly.

### How it works now
- `src/components/GoogleTagManager.tsx` renders `GTMHeadScript`/`GTMBodyNoscript` directly in `layout.tsx` (not via `next/script` — see the `next/script` gotcha in Critical Notes). GTM's own container config owns firing Meta Pixel (PageView on `gtm.dom`), GA4, and the Roku pixel.
- The app's only job is pushing correctly-shaped events to `window.dataLayer`:
  - **`TicketCartModal.tsx`** pushes `{ event: "begin_checkout", eventModel: { currency, value, transaction_id, items: [...], user_data: { email_address, phone_number } } }` when checkout starts. GTM's `FBEventName` variable maps `begin_checkout` → Meta's `InitiateCheckout` automatically.
  - **`PurchaseDataLayerPush.tsx`** (shared by ticket/brand/vendor confirmation pages) pushes `{ event: "purchase", eventModel: { transaction_id, value, currency, items: [...], user_data: {...} } }`.
  - **The nested `eventModel` wrapper is required** — GTM's Data Layer Variables read `eventModel.value`, `eventModel.user_data`, etc. A flat top-level push (the old shape) produces `undefined` values in Meta's tags even though the event technically fires.
- Advanced Matching (`user_data.email_address`/`phone_number`) is **plain-text**, not pre-hashed — GTM's own Meta Pixel template hashes it client-side via `fbq('init', pixelId, cidParams)`. Don't hash before pushing.
- **`META_CAPI_ACCESS_TOKEN`** Vercel env var is now unused (the direct CAPI code that read it was deleted) — safe to remove, low priority.

### If Google Ads/Meta conversions ever show zero or look wrong again
1. Check the GTM container directly (export via tagmanager.google.com → Admin → Export Container, or use a properly-registered GTM MCP connector — see the Stape/GTM MCP note below) for what conversion/tracking tags actually exist and what triggers them. **Do not assume a tag exists just because a Google Ads/Meta campaign is "running"** — a campaign can run indefinitely with zero tracking installed.
2. Check `window.dataLayer` shape in a live browser session against what the relevant GTM tag's variables expect — a silent shape mismatch (flat vs. nested, wrong key names) is the most common failure mode and won't throw any error anywhere.
3. Meta's Events Manager → Test Events tab (with a `test_event_code`) gives real-time feedback per event including populated/missing parameters — much faster than waiting on the Overview tab's 24–48h rolling match-quality score.

### GTM MCP / Stape connector — known gotcha
A GTM MCP connector (`gtm-mcp.stape.ai`) was tried once for direct container inspection but never got fully registered as a proper Claude Code MCP server. A **standalone `npx -y mcp-remote https://gtm-mcp.stape.ai/mcp` process** was instead left running persistently in the background (spawned from the Claude desktop app, not this CLI), which kept retrying its Google OAuth login indefinitely and popping a new browser tab on every retry — for days, until noticed and killed (`ps aux | grep mcp-remote`, then `kill`). **If this recurs:** kill the stray process, and check the Claude desktop app's own Settings → Connectors for a lingering "gtm"/Stape entry that could relaunch it on app restart. The simpler, proven-working alternative for inspecting the GTM container is asking the human to export it as JSON from tagmanager.google.com → Admin → Export Container and pasting it directly — no MCP/OAuth needed.

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
ADMIN_PASSWORD=...                      # used in x-admin-token header
CRON_SECRET=...                         # Vercel Cron auth — sent as Authorization: Bearer $CRON_SECRET automatically
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

### Tracking — GTM as sole source of truth (rebuilt this session)
- [x] Deleted the app's own direct Meta Pixel/CAPI code (`MetaPixelHead.tsx`, `MetaPixel.tsx`, `src/lib/metaCapi.ts`) in favor of GTM's pre-existing, official Meta Pixel + Conversions API Gateway integration
- [x] Reshaped `dataLayer.push()` calls to the nested `eventModel.*` structure GTM's tags actually read (was flat/incomplete before, causing low Meta match-quality scores)
- [x] See full "Tracking" section above for the complete architecture and a Google Ads zero-conversions troubleshooting checklist (open item — see Still Needs to Be Done)

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

### My Tickets Page Rebuilt (this session)
- [x] Real scannable QR code (was a fake decorative pattern), working "Download PDF", removed a leftover dev-only fake-check-in button — see full section above

### Marketing List Sync — Brevo + TextMagic
- [x] Every paid ticket purchase (not brand packages or vendor payments) syncs to the correct per-city Brevo + TextMagic list (`src/lib/marketingSync.ts`)

### Brand Package / Contacts Integration
- [x] Admin Brands → Contacts shows linked orders inline; rolling brand scroller pulls from paid `brand_package_orders`

---

## What Still Needs to Be Done

### High Priority
- [ ] **Google Ads showing zero conversions** — campaign is running, app has zero Google Ads code (confirmed via grep — any tracking here lives entirely in GTM, not the app), GTM MCP connector was flaky/never fully diagnosed this. Next step: export the GTM container JSON directly and check for an actual Google Ads Conversion Tracking tag + trigger; a running campaign with zero conversions almost always means either no conversion tag was ever installed, or a Google Ads "conversion action" exists in the Ads UI but was never linked to anything that fires it. See Tracking section's troubleshooting checklist.
- [ ] **Coupon/promo codes** at checkout — `coupons` table exists in DB, UI and API not built
- [ ] **Supabase RLS security audit** — Row Level Security policies need review on all tables

### Medium Priority
- [ ] **Stripe receipt link** on account page — not currently shown
- [ ] **City-specific logos** on each event page — using generic logo currently
- [ ] **Loyalty/points system** — DB table exists, no UI or award logic
- [ ] **Blog CMS** — page scaffolded, needs admin editing and real content
- [ ] **Push notifications** — VAPID keys in env, not wired up
- [ ] **Remove unused `META_CAPI_ACCESS_TOKEN`** Vercel env var — low priority cleanup, see Tracking section

### Nice to Have
- [ ] **AI auto-reply in inbox** — OpenAI key exists, partially wired
- [ ] **Columbus event page** — city site not built at `/Users/adambossin/Sites/tequila-fest-columbus`
- [ ] **Affiliate dashboard** — signup exists, no commission tracking UI for affiliates
- [ ] **Sponsor portal**, **Brand owner portal** — not built
- [ ] **Admin analytics** — revenue by city, ticket type breakdown, etc. beyond what Overview already shows

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

18. **The app has zero direct Meta Pixel/CAPI or Google Ads code** — all conversion tracking (Meta, GA4, Roku, and any future Google Ads conversion tag) lives entirely inside Google Tag Manager (`GTM-P3Q33V72`). The app's only responsibility is pushing correctly-shaped events to `window.dataLayer` (see full Tracking section). Don't add a direct Pixel/gtag/CAPI integration without first checking whether GTM already handles it — that exact duplication caused a real incident this session (see Tracking section).

19. **Any new admin aggregate/reporting query must**: (a) use `fetchAllRows()` if it could plausibly return >1000 rows, (b) join via Postgres embedded-resource syntax rather than building ID lists client-side, and (c) filter `ticket_orders.status = 'paid' AND source != 'media_comp'` unless there's a specific reason not to (check-in stats). Test any change to `/api/admin/stats` or `/api/admin/events` against both "All Cities" and a specific city filter — a past bug only manifested in one of the two paths.

20. **When an "outdated demo/dev-only" comment exists in shipped code, don't trust that it's actually inert** — the My Tickets fake check-in button was commented `Dev/demo only — remove in prod` and still ran real (if client-side-only) logic that confused a paying customer. If you see this pattern elsewhere, verify what the code actually does before assuming the comment means it's harmless.
