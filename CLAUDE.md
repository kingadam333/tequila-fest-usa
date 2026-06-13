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
- **Payments:** Stripe (Checkout Sessions + Webhooks)
- **Email:** Resend (domain: `mail.tequilafestusa.com` — verified sending domain)
- **Hosting:** Vercel (GitHub repo: `kingadam333/tequila-fest-usa`, auto-deploy on push to `main`)
- **CDN/Security:** Cloudflare (proxying `tequilafestusa.com` and `www.tequilafestusa.com`)
- **AI Inbox:** OpenAI (wired up in admin dashboard)

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

---

## Live URLs

- **Production:** `https://www.tequilafestusa.com`
- **Vercel project ID:** `prj_AC1DQ2W2sbRXqTLxrFEi6RNAulQH`
- **Team ID:** `team_uNpBDSx22K4MFIS59wN7Qmwv`
- **Supabase project:** `https://igktkkjnyxeiflnvfzdw.supabase.co`

---

## Events (4 Cities)

| City | Slug | Date | Venue | Price | Status |
|---|---|---|---|---|---|
| Cincinnati | `cincinnati` | June 13, 2026, 3–9 PM | Fountain Square, Downtown Cincinnati | $55 | on_sale |
| Cleveland | `cleveland` | July 25, 2026, 3–9 PM | Cuyahoga County Fairgrounds, Berea OH | $55 | on_sale |
| Columbus | `columbus` | Aug 8, 2026, 3–9 PM | Gravity/Greater Columbus Convention Center | $55 | on_sale |
| Phoenix | `phoenix` | Nov 14, 2026, 3–9 PM | Phoenix Convention Center | $55 | coming_soon |

Event data is defined in `src/lib/events.ts`. VIP ticket available at all events.

**Phoenix is set to `coming_soon`** — homepage card shows "🔔 COMING SOON" (non-clickable), event page shows Coming Soon UI. Status is stored in the `events` DB table. The DB check constraint was updated to allow: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon`.

**Homepage event cards** (`src/components/EventCards.tsx`) are **hardcoded** — they do not read from the DB. To change a city's status on the homepage, update the `status` field in that file directly. The individual event pages (`/events/[slug]`) DO read status from the DB.

---

## Database Schema (Supabase — Key Tables)

| Table | Purpose |
|---|---|
| `ticket_orders` | Purchase records — order_number, customer_email, event_slug, ticket_type, quantity, total, stripe_session_id, status |
| `ticket_instances` | Individual QR-coded tickets — one row per ticket, linked to order_id |
| `customer_accounts` | User profiles — linked to Supabase Auth by UUID |
| `contact_submissions` | Contact form submissions — inbox, status, admin_reply |
| `events` | Event rows managed in admin — status check constraint: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon` |
| `ticket_types` | Per-event ticket type config |
| `affiliates` | Affiliate accounts + commission tracking |
| `blog_posts` | Blog content |
| `coupons` | Discount codes |
| `brand_contacts` | Tequila brand contacts — contact_name, contact_email, contact_phone, contact_type (distributor/supplier/self_distributed), brands (JSONB: [{name, price_per_bottle}]), distributor, supplier, notes |
| `brand_invoices` | Brand invoices — linked to brand_contacts, line_items JSONB, total, status (draft/sent/paid/cancelled), stripe_payment_link_id/url |
| `staff_members` | Check-in staff — id, name, email, password_hash (bcrypt), permissions (array), status, last_login_at |
| `vendor_applications` | Vendor form submissions — business_name, cities (array), stripe_session_id, status (pending/approved/paid) |

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/lib/events.ts` | Event data definitions (city, date, venue, slug) |
| `src/lib/stripe.ts` | Stripe client + TICKET_LABELS map |
| `src/lib/resend.ts` | Resend client + all email HTML templates |
| `src/lib/supabase.ts` | Supabase client (anon + admin) |
| `src/lib/turnstile.ts` | Cloudflare Turnstile server-side verification (enforced — see CAPTCHA section) |
| `src/components/Turnstile.tsx` | Turnstile widget React component (renders once, no remount loop) |
| `src/lib/adminAuth.ts` | Admin token verification |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler — creates order, QR tickets, auth account, sends ONE combined email |
| `src/app/api/admin/resend-email/route.ts` | Admin: resend ticket email for any order (uses qrTicketHtml) |
| `src/app/api/admin/contact/route.ts` | Admin: GET submissions, POST reply |
| `src/app/api/session-email/route.ts` | Fetches customer email from Stripe session (for post-purchase flow) |
| `src/app/admin/AdminDashboard.tsx` | Full admin dashboard (orders, events, users, inbox, AI, staff, check-in) |
| `src/components/EventCards.tsx` | Homepage city event cards — hardcoded data, includes status field per city |
| `src/components/TicketCartModal.tsx` | Ticket purchase modal on city event pages |
| `src/components/PreCheckoutModal.tsx` | Pre-checkout info collection modal |
| `src/app/login/LoginPage.tsx` | Login page — detects staff accounts and redirects to /checkin with JWT |
| `src/app/ticket-confirmation/ConfirmationPage.tsx` | Post-Stripe success page |
| `src/app/checkin/page.tsx` | Staff check-in portal — fullscreen QR scanner, auto check-in, order progress |
| `src/app/vendors/page.tsx` | Vendor application form — multi-select cities, $150/city pricing |
| `src/components/MetaPixel.tsx` | Meta Pixel tracking (PageView, InitiateCheckout, Purchase) |
| `src/components/InstallBanner.tsx` | PWA install banner — Android native prompt, iOS instructions |
| `src/lib/checkinAuth.ts` | Verifies check-in requests — admin password OR any valid staff JWT |
| `src/lib/staffAuth.ts` | Staff JWT sign/verify (jose, HS256, 12h expiry) |
| `src/app/api/checkin/lookup/route.ts` | Ticket lookup by QR/name/email/order — returns orderTickets siblings |
| `src/app/api/checkin/confirm/route.ts` | Sets ticket status to 'used' + checked_in_at timestamp |
| `src/app/api/checkin/stats/route.ts` | Live check-in stats by event — total, used count, by type breakdown |
| `src/app/api/staff/login/route.ts` | Staff login — bcrypt verify, returns JWT |
| `src/app/api/admin/staff/[id]/route.ts` | Staff CRUD + set_password action |
| `src/app/api/admin/checkin-stats/route.ts` | Admin check-in stats + staff roster with status |
| `src/app/api/admin/user-tickets/route.ts` | Fetch all tickets+QR codes for a customer email |
| `src/app/api/admin/vendors/route.ts` | Vendor application — creates Stripe line items per city ($150 each) |
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
**From address:** `Tequila Fest USA <help@mail.tequilafestusa.com>`

### How It Works
1. Customer completes Stripe checkout → Stripe fires webhook to `https://www.tequilafestusa.com/api/webhooks/stripe`
2. Webhook handler (`handleCheckoutComplete`) in `src/app/api/webhooks/stripe/route.ts`:
   - Inserts order into `ticket_orders`
   - Creates QR-coded rows in `ticket_instances`
   - Checks `customer_accounts` table **by email** to see if account exists (not `listUsers()`)
   - If **new customer**: creates Supabase Auth account with generated password
   - Sends **ONE combined email** with QR tickets + order summary + (if new account) login credentials
3. Admin can resend via the **Send icon (→)** in Admin → Orders, which calls `/api/admin/resend-email`

### Email Templates in `src/lib/resend.ts`
- `qrTicketHtml()` — **Main post-purchase email**: QR codes + order summary + optional account credentials. Params: `firstName, eventCity, eventDate, eventTime, eventVenue, orderNumber, tickets[], appUrl, total?, ticketType?, quantity?, newPassword?`
- `ticketConfirmationHtml()` — Legacy simple confirmation (exists but no longer sent on purchase)
- `welcomeAccountHtml()` — Standalone account welcome (no longer sent separately — merged into `qrTicketHtml`)
- `passwordResetHtml()` — Password reset email
- `INBOX_ROUTING` — Maps contact form subjects → inbox labels (all send from `@mail.tequilafestusa.com`)

### Critical Rules
- **Only ONE email per purchase** — sending two to the same recipient in the same webhook execution causes Resend to silently drop one
- **`RESEND_API_KEY` must be active** — the previous key was silently revoked; if emails stop, generate a new key at resend.com/api-keys and update Vercel env
- **Contact form emails go to the admin inbox in the website** (Supabase `contact_submissions` table) — they do NOT forward to any external email

### Why Emails Were Broken (History — Fixed)
1. Resend API key was stale/revoked
2. Turnstile was blocking all form submissions server-side with empty tokens
3. Stripe webhook 308 redirect (bare domain → www) — Stripe doesn't follow redirects
4. Two emails sent back-to-back to same recipient — Resend dropped the second
5. `listUsers()` only returns 50 users — replaced with direct `customer_accounts` DB lookup

---

## Stripe Configuration

- **Webhook URL:** `https://www.tequilafestusa.com/api/webhooks/stripe` (must be exact — www prefix required, no trailing slash)
- **Webhook events:** `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- **Webhook signing secret:** stored as `STRIPE_WEBHOOK_SECRET` in Vercel env
- **Success URL:** `https://www.tequilafestusa.com/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}`
- **Service fee:** shown as "Service Fee" line item only (no description breakdown)

---

## Post-Purchase Flow

1. Customer pays via Stripe Checkout
2. Stripe redirects to `/ticket-confirmation?session_id=cs_xxx`
3. `ConfirmationPage.tsx` calls `/api/session-email?session_id=cs_xxx` to get customer email
4. "View My Tickets" button links to `/login?email=customer@email.com&redirect=/account`
5. Login page pre-fills email from URL param, redirects to `/account` after login
6. `/account` shows orders and QR tickets

---

## Admin Dashboard

URL: `/admin` (requires admin password — sent as `x-admin-token` header)

### Sections
- **Orders** — all ticket purchases, Stripe receipt link, **Send icon resends ticket email**, refund button. Save now shows error alert if it fails.
- **Events** — manage event listings and ticket types. Status options: `on_sale`, `coming_soon`, `sold_out`, `draft`, `cancelled`
- **Users** — customer accounts
- **Brands** — tequila brand contacts, invoicing, and inbox (brands@mail.tequilafestusa.com). Sub-tabs: Contacts / Invoices / Inbox. Contacts stored in `brand_contacts`. Invoices in `brand_invoices` with auto-generated Stripe payment links emailed on creation.
- **Inbox** — contact form submissions by type (Support / Sponsors / Affiliates / Brands). Reads from `contact_submissions` via `/api/admin/contact` GET. Supports AI-generated replies.
- **Staff** — staff management
- **Analytics** — site stats

### Admin API Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/resend-email` | POST | Resend ticket email. Body: `{ order_number }` |
| `/api/admin/contact` | GET | Fetch all contact submissions |
| `/api/admin/contact` | POST | Send reply to a submission |
| `/api/admin/test-email` | POST | Test Resend directly. Body: `{ to }` |
| `/api/admin/refund` | POST | Issue Stripe refund |
| `/api/admin/events` | GET | List all events with ticket types + live sold counts |
| `/api/admin/events/[id]` | PATCH | Update event fields including status |
| `/api/admin/brands` | GET/POST/PATCH/DELETE | Brand contacts CRUD |
| `/api/admin/brands/invoices` | GET/POST/PATCH | Brand invoices — POST creates invoice + Stripe payment link + emails brand contact |

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
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...      # Cloudflare Turnstile site key
TURNSTILE_SECRET_KEY=...                # Cloudflare Turnstile secret key
OPENAI_API_KEY=...
```

---

## What Has Been Built (Completed)

### Infrastructure
- [x] Next.js 16 App Router project scaffolded
- [x] Supabase project created and schema migrated
- [x] GitHub repo `kingadam333/tequila-fest-usa` connected to Vercel (auto-deploy on push to `main`)
- [x] Custom domain `www.tequilafestusa.com` live on Vercel via Cloudflare
- [x] All Vercel env vars configured
- [x] Cloudflare SSL Full (Strict), Bot Fight Mode off, Browser Integrity Check off
- [x] Cloudflare Turnstile re-enabled and working on all 9 forms

### Pages Built
- [x] Homepage — hero, event cards (city cards link to `#tickets`), highlights, sponsors
- [x] `/events` — all events listing
- [x] `/events/[slug]` — individual event pages with `#tickets` anchor
- [x] `/login` — with `?email=` and `?redirect=` URL param support + Suspense wrapper
- [x] `/signup`
- [x] `/account` — order history, QR tickets
- [x] `/ticket-confirmation` — post-Stripe success page, prefills login link with customer email
- [x] `/contact` — contact form (saves to Supabase `contact_submissions`)
- [x] `/affiliates`, `/vendors`, `/press`, `/sponsors`, `/forgot-password`
- [x] `/admin` — full admin dashboard
- [x] `/blog`

### Ticket Purchase Flow
- [x] `TicketCartModal.tsx` and `PreCheckoutModal.tsx` — Turnstile working
- [x] Stripe Checkout Session creation via `/api/pre-checkout`
- [x] Stripe webhook handler — order creation, QR ticket generation, auth account creation, one combined email
- [x] Service fee shown as "Service Fee" only (no breakdown)

### Email System
- [x] Resend domain `mail.tequilafestusa.com` verified
- [x] Active Resend API key configured
- [x] ONE combined ticket email: QR codes + order summary + account credentials
- [x] Account existence check uses `customer_accounts` table (not broken `listUsers()`)
- [x] Admin "Resend Ticket Email" button (Send icon in Orders) fully wired up
- [x] Admin inbox reads from Supabase via `/api/admin/contact` server-side route (not broken client-side `supabaseAdmin`)

### Event Status
- [x] Phoenix set to `coming_soon` in DB
- [x] Homepage Phoenix card shows "🔔 COMING SOON" (non-clickable)
- [x] DB check constraint updated to allow `coming_soon`
- [x] Admin event save now shows error alert on failure

### Staff Check-In System (`/checkin`)
- [x] `staff_members` table with bcrypt passwords + JWT auth (jose)
- [x] `/api/staff/login` — staff-only login endpoint
- [x] Main login (`/login`) detects staff emails → stores `Bearer <jwt>` in localStorage → redirects to `/checkin` (solves PWA no-URL-bar problem)
- [x] Check-in portal auto-loads staff JWT from localStorage on mount
- [x] **Fullscreen QR scanner overlay** — covers entire screen, gold viewfinder, flash on scan
- [x] **Auto check-in on scan** — immediately calls confirm API, no extra tap
- [x] **Order progress card** — shows all tickets in same order, ✓ checked / remaining
- [x] Undo check-in button
- [x] Live stats with per-type breakdown bars
- [x] Admin can set/change staff passwords from admin dashboard
- [x] Admin check-in section shows live DB stats + staff roster with online/active/pending/expired status badges
- [x] "View Dashboard" button in Users section shows customer tickets + QR codes

### Ticket Check-In Status
- `ticket_instances.status` check constraint (`ticket_instances_status_check`) allows: `valid`, `used`, `cancelled`, `refunded`, `pending`, `transferred`
- **Checked-in tickets are set to `status = 'used'`** (NOT "checked_in" — that violates the constraint)
- `checked_in_at` column stores the timestamp

### PWA
- [x] `@ducanh2912/next-pwa` installed — service worker auto-generated
- [x] `public/manifest.json` — name "Tequila Fest USA", theme #F5A623, shortcuts to /events and /account
- [x] 11 icon sizes generated (72–512px) + 2 maskable — Python/Pillow, radial gradient + skull logo
- [x] Install banner (`InstallBanner.tsx`) — Android native prompt, iOS 3-step instructions, shows immediately, dismisses 7 days
- [x] `next.config.ts` — added `turbopack: {}` to silence webpack/Turbopack conflict from next-pwa

### Meta Pixel
- [x] `MetaPixel.tsx` component fires PageView on every route change
- [x] `NEXT_PUBLIC_META_PIXEL_ID=1968617953699126` set in Vercel env (baked at build time)
- [x] `trackPixelEvent()` helper exported for InitiateCheckout / Purchase events

### Vendor Flow
- [x] Vendor form: multi-select city checkboxes (Cincinnati / Cleveland / Columbus / Phoenix)
- [x] Live total displayed under checkboxes
- [x] Heading changed to "OUR UPCOMING EVENTS" (removed "2026")
- [x] "$150 per city" fee banner above form
- [x] Stripe checkout: one line item per city — "Vendor - Cincinnati", "Vendor - Cleveland", etc. at $150 each
- [x] Vendor applications in `vendor_applications` DB table

### Bug Fixes
- [x] Cloudflare Turnstile spinning loop — fixed via refs in Turnstile.tsx
- [x] Stripe webhook 308 redirect — webhook URL updated to www
- [x] All site links updated from `tequila-fest-usa.vercel.app` → `www.tequilafestusa.com`
- [x] `useSearchParams()` Suspense boundary on login page
- [x] Admin inbox was empty — `supabaseAdmin` was used in client component (server-only key)
- [x] Two back-to-back emails dropped by Resend — merged into one
- [x] `listUsers()` pagination bug — replaced with direct DB lookup

---

## What Still Needs to Be Done

### High Priority
- [ ] **Coupon/promo codes** at checkout — `coupons` table exists in DB, UI and API not built
- [ ] **Supabase RLS security audit** — Row Level Security policies need review on all tables

### Medium Priority
- [ ] **Stripe receipt link** on account page — not currently shown
- [ ] **Email blast to Cincinnati ticket holders** — event details / day-of info
- [ ] **City-specific logos** on each event page — using generic logo currently
- [x] ~~**Check-in / QR scanner page**~~ — **DONE** — `/checkin` is fully built and working
- [ ] **Loyalty/points system** — DB table exists, no UI or award logic
- [ ] **Vendor application admin workflow** — form submits but no review/approval in admin
- [ ] **Blog CMS** — page scaffolded, needs admin editing and real content
- [ ] **Push notifications** — VAPID keys in env, not wired up

### Nice to Have
- [ ] **AI auto-reply in inbox** — OpenAI key exists, partially wired
- [ ] **Columbus event page** — city site not built at `/Users/adambossin/Sites/tequila-fest-columbus`
- [ ] **Affiliate dashboard** — signup exists, no commission tracking UI for affiliates
- [ ] **Sponsor portal** — not built
- [ ] **Brand owner portal** — not built
- [ ] **Admin analytics** — revenue by city, ticket type breakdown, etc.
- [ ] **Wire homepage EventCards to DB** — so admin status changes reflect on homepage without code deploy

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

| File | Purpose |
|---|---|
| `server/routes.ts` | All original API endpoints (~3000 lines) |
| `server/affiliateRoutes.ts` | Affiliate program routes |
| `shared/schema.ts` | Full original database schema (Drizzle) |
| `server/lib/checkoutFollowupEmails.ts` | Post-purchase email flows |
| `server/lib/affiliates.ts` | Affiliate tracking logic |

---

## AI Inbox (Support Tickets)

### How It Works
- Contact form submissions → `contact_submissions` table → AI processes inline (awaited) in `/api/contact`
- AI uses OpenAI `gpt-4o-mini` (NOT Anthropic/Claude) — key is `OPENAI_API_KEY` in Vercel
- Knowledge base loaded from `knowledge_base` DB table (9 entries) at runtime
- If AI confident → auto-replies to customer, sets status `auto-replied`
- If AI not confident → escalates to `adam@tequilafestusa.com` with "Open Ticket in Tequila Fest Inbox" email, sets status `needs-review`
- Manual trigger: admin can click "Auto-Handle with AI" button on any `new` or `needs-review` ticket

### DB Status Values
`contact_submissions_status_check` constraint allows: `new`, `read`, `replied`, `closed`, `auto-replied`, `needs-review`

### Key Files
- `src/lib/aiInbox.ts` — OpenAI client, knowledge base, `generateAIReply()`
- `src/lib/aiInboxEmail.ts` — Email HTML builders: `buildReplyHtml()`, `buildEscalationHtml()`
- `src/app/api/ai-inbox/route.ts` — Manual trigger endpoint (POST with submissionId)
- `src/app/api/contact/route.ts` — Contact form handler; AI runs INLINE (awaited) before response returns

### Admin Inbox UI (`src/app/admin/AdminDashboard.tsx`)
- Blue "✨ AI" chip = auto-replied
- Orange border = needs-review
- Trash icon = delete (calls DELETE `/api/admin/contact`)
- "Auto-Handle with AI" button (🤖) = manual AI trigger

---

## Inbound Email (Customer Replies) — INCOMPLETE / NEEDS FIX

**Goal:** When a customer replies to their ticket confirmation email (sent to `help@mail.tequilafestusa.com`), that reply should appear in the admin inbox and be AI-handled.

**Current Status:** Webhook fires correctly (200 OK in Resend), email appears in Resend "Receiving emails" — but body is never captured. Emails land in admin inbox with placeholder text only.

**Root Cause:** Resend's inbound webhook payload for `mail.tequilafestusa.com` does NOT include `data.text` or `data.html`. The `GET /emails/{email_id}` API returns 404 for inbound email IDs (that endpoint is for sent emails only). Body is completely inaccessible through Resend's API for this domain configuration.

**Working Reference:** `mail.tastecleveland.net` (sister project) has a working setup where the Resend webhook payload DOES include the body. The Taste Cleveland Supabase edge function (`process-inbound-email`) successfully reads the body. The exact configuration difference between the two domains was not identified in this session.

**Root Cause (solved by Opus):** Resend's `email.received` webhook payload is metadata-only by design. Body must be fetched separately. Two different endpoints exist:
- `GET /emails/{id}` — for **sent** emails only → always 404 for inbound
- `GET /emails/receiving/{id}` — for **inbound** emails → returns `{ text, html, headers, attachments, raw }`

Sonnet 4.6 kept retrying `/emails/{id}` with workarounds (delays, different ID formats) instead of checking the docs for the correct endpoint. Opus found it immediately.

**Current behavior** (`src/app/api/webhooks/email-inbound/route.ts`):
- Email arrives → saved to `contact_submissions` with subject as message placeholder
- Escalated to `adam@tequilafestusa.com` with `needs-review` status
- Customer does NOT receive auto-reply

**Resend Webhook Config:**
- URL: `https://www.tequilafestusa.com/api/webhooks/email-inbound`
- Event: `email.received`
- Status: Enabled

---

## Critical Notes for Next Session

1. **Stripe webhook URL must be exactly `https://www.tequilafestusa.com/api/webhooks/stripe`** — www prefix required. Cloudflare redirects bare domain with 308 and Stripe does not follow redirects.

2. **Only ONE Resend email per webhook execution** — do not add a second `resend.emails.send()` for the same recipient. Resend silently drops it.

3. **`RESEND_API_KEY` must be active** — check resend.com/api-keys if emails stop. Previous key was silently revoked.

4. **Never import `supabaseAdmin` in a client component** — `SUPABASE_SERVICE_ROLE_KEY` is server-only. Always fetch via an API route.

5. **Turnstile is working** — the fix was stabilizing callbacks in refs inside `Turnstile.tsx`. Do not change the dependency array of the widget's `useEffect`. If Turnstile ever starts looping again, the cause is callbacks being recreated on every render.

6. **Local builds fail** with `supabaseUrl is required` — Vercel pulls empty strings for secrets locally. This is expected and harmless. Vercel production builds work fine.

7. **Homepage event cards are hardcoded** (`src/components/EventCards.tsx`) — admin status changes only affect individual event pages, not the homepage cards. Update the `status` field in `EventCards.tsx` directly to change homepage display.

8. **DB events status constraint** — allowed values: `draft`, `on_sale`, `sold_out`, `cancelled`, `coming_soon`. Adding any new status requires an `ALTER TABLE` to update the check constraint first.

9. **`ticket_instances` status constraint** — `ticket_instances_status_check` allows: `valid`, `used`, `cancelled`, `refunded`, `pending`, `transferred`. Checked-in tickets must be set to `"used"` — `"checked_in"` is **NOT** an allowed value and will throw a constraint violation error.

10. **Staff JWT permissions** — `verifyCheckinAccess()` allows any valid staff JWT (no specific permission required). Staff members may have empty `permissions: []` arrays in DB — this is fine, they can still access `/checkin`.

11. **Supabase project ID** — `igktkkjnyxeiflnvfzdw` (confirmed via `list_projects` MCP). The old ID `ycyxswsubxigpkehuqcf` was wrong — always use `igktkkjnyxeiflnvfzdw`.

12. **`.env.local` values are dotenvx-encrypted** — `cat .env.local` shows empty strings. The actual secrets are encrypted in the file. Vercel CLI `env pull` also shows empty strings. To read actual values, use `npx @dotenvx/dotenvx run -- node -e "..."` or query the live DB via the Supabase MCP with project ID `igktkkjnyxeiflnvfzdw`.
