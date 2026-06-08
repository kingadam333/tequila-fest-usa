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

| City | Slug | Date | Venue | Price |
|---|---|---|---|---|
| Cincinnati | `tequila-fest-cincinnati-2026` | June 13, 2026, 3–9 PM | Fountain Square, Downtown Cincinnati | $75 |
| Cleveland | `tequila-fest-cleveland-2026` | July 25, 2026, 3–9 PM | Cuyahoga County Fairgrounds, Berea OH | $75 |
| Columbus | `tequila-fest-columbus-2026` | Aug 8, 2026, 3–9 PM | Gravity/Greater Columbus Convention Center | $75 |
| Phoenix | `tequila-fest-phoenix-2026` | Nov 14, 2026, 3–9 PM | Phoenix Convention Center | $85 |

Event data is defined in `src/lib/events.ts`. VIP ticket available at all events.

---

## Database Schema (Supabase — Key Tables)

| Table | Purpose |
|---|---|
| `ticket_orders` | Purchase records — order_number, customer_email, event_slug, ticket_type, quantity, total, stripe_session_id, status |
| `ticket_instances` | Individual QR-coded tickets — one row per ticket, linked to order_id |
| `customer_accounts` | User profiles — linked to Supabase Auth by UUID |
| `contact_submissions` | Contact form submissions — inbox, status, admin_reply |
| `events` | Event rows managed in admin |
| `ticket_types` | Per-event ticket type config |
| `affiliates` | Affiliate accounts + commission tracking |
| `blog_posts` | Blog content |
| `coupons` | Discount codes |

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
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler — creates order, QR tickets, auth account, sends email |
| `src/app/api/admin/resend-email/route.ts` | Admin: resend ticket email for any order |
| `src/app/api/admin/contact/route.ts` | Admin: GET submissions, POST reply |
| `src/app/api/session-email/route.ts` | Fetches customer email from Stripe session (for post-purchase flow) |
| `src/app/admin/AdminDashboard.tsx` | Full admin dashboard (orders, events, users, inbox, AI, staff) |
| `src/components/TicketCartModal.tsx` | Ticket purchase modal on city event pages |
| `src/components/PreCheckoutModal.tsx` | Pre-checkout info collection modal |
| `src/app/login/LoginPage.tsx` | Login page (supports ?email= and ?redirect= URL params) |
| `src/app/ticket-confirmation/ConfirmationPage.tsx` | Post-Stripe success page |

---

## CAPTCHA — Cloudflare Turnstile (working, enforced site-wide)

Turnstile protects every public form. It was looping/spinning in production earlier; the fix and the correct setup are documented here so it can be reproduced.

### Why it was looping (the bug)
The widget component had `onVerify/onError/onExpire` in its `useEffect` dependency array. Parents pass inline arrow functions, so every keystroke re-render created new function references → the effect tore down (`turnstile.remove()`) and re-rendered the widget → endless spin/reset. **Fix:** callbacks are held in refs so the effect depends only on `siteKey` and renders exactly once. Also sets `retry: "never"`.

### How it's wired
- **Client:** [`src/components/Turnstile.tsx`](src/components/Turnstile.tsx) renders the widget. Each form holds `const [captchaToken, setCaptchaToken] = useState("")`, renders `<Turnstile onVerify={setCaptchaToken} onError/onExpire={() => setCaptchaToken("")} />` above the submit button, disables submit until a token exists, sends the token in the request body, and clears the token on any failure (tokens are single-use).
- **Server:** [`src/lib/turnstile.ts`](src/lib/turnstile.ts) `verifyTurnstile()` is called by every form route. Rule: **no `TURNSTILE_SECRET_KEY` set = dev skip; secret set (production) = a real token is required** or the request is rejected. There is **no `"bypass"` escape hatch** anymore.
- **Forms covered (9):** contact, signup, login, forgot-password, vendors, sponsors, affiliates, press, and the two checkout modals (`PreCheckoutModal`, `TicketCartModal`). Routes: `/api/contact` (contact/sponsors/affiliates/press), `/api/vendor-apply`, `/api/auth/*`, `/api/pre-checkout`.

### Required config (all three must be correct or it loops)
1. **Cloudflare → Turnstile widget → Hostnames:** must list `tequilafestusa.com`, `www.tequilafestusa.com`, AND `tequila-fest-usa.vercel.app`. A missing hostname is the #1 cause of an infinite spinner.
2. **Widget Mode:** `Managed` (Recommended). Not Invisible.
3. **No account-level WAF "Managed Challenge"** firing on form routes (would stack with Turnstile). N/A here — WAF add-on isn't purchased.
4. **Vercel env vars** (production + preview + development), then redeploy:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public)
   - `TURNSTILE_SECRET_KEY` (secret)

### Local dev / testing
`vercel env pull` blanks all protected values, so local `.env.local` keys come up empty. Use Cloudflare's **always-pass test keys** in `.env.local` to exercise the real widget locally:
- Site key: `1x00000000000000000000AA`
- Secret key: `1x0000000000000000000000000000000AA`

With these, the widget renders, issues a dummy token (`XXXX.DUMMY.TOKEN.XXXX`), and enables the submit button — proving the wiring without bot friction. (Test keys are local-only; production uses the real keys in Vercel.)

---

## Email System (Resend)

**Sending domain:** `mail.tequilafestusa.com` (verified in Resend)
**From address:** `Tequila Fest USA <help@mail.tequilafestusa.com>`

### How It Works
1. Customer completes Stripe checkout → Stripe fires webhook to `https://www.tequilafestusa.com/api/webhooks/stripe`
2. Webhook handler (`handleCheckoutComplete`):
   - Inserts order into `ticket_orders`
   - Creates QR-coded rows in `ticket_instances`
   - Checks `customer_accounts` table (by email) to see if account exists
   - If **new customer**: creates Supabase Auth account with generated password
   - Sends **one combined email** with QR tickets + order summary + (if new account) login credentials
3. Admin can resend via the **Send icon** in Orders section, which calls `/api/admin/resend-email`

### Email Templates in `src/lib/resend.ts`
- `qrTicketHtml()` — Main post-purchase email: QR codes + order summary + optional account credentials. Accepts: `firstName, eventCity, eventDate, eventTime, eventVenue, orderNumber, tickets[], appUrl, total?, ticketType?, quantity?, newPassword?`
- `ticketConfirmationHtml()` — Legacy simple confirmation (still exists, no longer sent on purchase)
- `welcomeAccountHtml()` — Standalone account welcome (no longer sent separately — merged into qrTicketHtml)
- `passwordResetHtml()` — Password reset email
- `INBOX_ROUTING` — Maps contact form subjects to inbox labels (all send from `@mail.tequilafestusa.com`)

### Critical: Why Emails Were Broken (Fixed)
1. **Resend API key was stale/revoked** — User generated new key in Resend dashboard and updated `RESEND_API_KEY` in Vercel env vars
2. **Turnstile was blocking all form submissions** — Turnstile widget was removed from frontend but server still called `verifyTurnstile()` with empty token → returned false → all API routes returned 400. Fixed in `src/lib/turnstile.ts` to bypass when token is empty or `"bypass"`
3. **Stripe webhook 308 redirect** — Webhook URL in Stripe was set to `https://tequilafestusa.com` (no-www). Cloudflare redirects bare domain to www with 308. Stripe does not follow redirects. Fixed by updating Stripe webhook URL to `https://www.tequilafestusa.com/api/webhooks/stripe`
4. **Two emails sent back-to-back to same recipient** — Resend silently dropped the second one. Fixed by merging QR ticket email and confirmation email into one
5. **`listUsers()` only returns 50 users** — Account existence check used `adminAuth.auth.admin.listUsers()` which is paginated to 50 by default. For >50 customers, existing users would be treated as new, causing duplicate account creation failure. Fixed to check `customer_accounts` table by email instead

---

## Cloudflare Setup

**Domain:** `tequilafestusa.com` → Cloudflare → Vercel

### DNS Records
- `A` record: `tequilafestusa.com` → Vercel IP (proxied through Cloudflare)
- `CNAME` record: `www` → Vercel (proxied through Cloudflare)
- `CNAME` record: `mail` → Resend sending domain (for email)

### SSL/TLS Settings
- **SSL Mode:** Full (Strict) — required. "Full" (non-strict) caused redirect loops previously. Set to Full (Strict) under SSL/TLS → Overview.
- **Minimum TLS:** 1.2

### Security Settings That Caused Problems
- **Bot Fight Mode** — was interfering with Stripe webhook and form submissions. If webhook issues return, check this setting under Security → Bots.
- **Browser Integrity Check** — can block legitimate API calls. Under Security → Settings.
- **Security Level** — set to Medium or lower. High caused false positives on checkout.
- **Cloudflare Turnstile** — Widget was added to all forms but caused spinning/verification loop on checkout and login pages. Root issue was `onExpire` callback creating new function on every React render → widget remounted on every keystroke. **Final fix: Turnstile removed from all forms entirely.** Server-side `verifyTurnstile()` now bypasses verification when token is empty or `"bypass"`.

### Turnstile Status
Turnstile is **disabled on all forms**. The following files send `captchaToken: "bypass"`:
- `TicketCartModal.tsx`
- `PreCheckoutModal.tsx`
- `LoginPage.tsx`
- `SignupPage.tsx`
- `ContactPage.tsx`
- `vendors/page.tsx`, `press/page.tsx`, `sponsors/page.tsx`, `affiliates/page.tsx`, `forgot-password/page.tsx`

Server-side bypass is in `src/lib/turnstile.ts` — returns `true` when token is empty or `"bypass"`. **Do not re-enable Turnstile without testing thoroughly.**

---

## Stripe Configuration

- **Webhook URL:** `https://www.tequilafestusa.com/api/webhooks/stripe` (must be exact — www prefix required)
- **Webhook events:** `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- **Webhook signing secret:** stored as `STRIPE_WEBHOOK_SECRET` in Vercel env
- **Success URL:** `https://www.tequilafestusa.com/ticket-confirmation?session_id={CHECKOUT_SESSION_ID}`
- **Service fee:** shown as "Service Fee" line item (no description breakdown)

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

URL: `/admin` (requires admin password)

### Sections
- **Orders** — all ticket purchases, Stripe receipt link, resend ticket email button (Send icon), refund button
- **Events** — manage event listings and ticket types
- **Users** — customer accounts
- **Inbox** — contact form submissions organized by type (Support / Sponsors / Affiliates). Reads from `contact_submissions` table via `/api/admin/contact` GET endpoint. Supports AI-generated replies.
- **Staff** — staff management
- **Analytics** — site stats

### Admin API Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/resend-email` | POST | Resend ticket email for order. Body: `{ order_number }` |
| `/api/admin/contact` | GET | Fetch all contact submissions |
| `/api/admin/contact` | POST | Send reply to submission |
| `/api/admin/test-email` | POST | Test Resend directly. Body: `{ to }` |
| `/api/admin/refund` | POST | Issue Stripe refund |
| `/api/admin/events` | GET/POST | Manage events |

All admin endpoints require `x-admin-token` header.

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
RESEND_API_KEY=...          # must be current/active key from resend.com dashboard
ADMIN_PASSWORD=...          # used in x-admin-token header
TURNSTILE_SECRET_KEY=...    # exists but effectively unused (bypass active)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...  # exists but widget removed from all forms
OPENAI_API_KEY=...
```

---

## What Has Been Built (Completed)

### Infrastructure
- [x] Next.js 16 App Router project scaffolded
- [x] Supabase project created and schema migrated
- [x] GitHub repo `kingadam333/tequila-fest-usa` connected to Vercel
- [x] Custom domain `www.tequilafestusa.com` live on Vercel via Cloudflare
- [x] All Vercel env vars configured
- [x] `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` updated from `tequila-fest-usa.vercel.app` to `https://www.tequilafestusa.com`

### Pages Built
- [x] Homepage — hero, event cards, highlights, sponsors
- [x] `/events` — all events listing
- [x] `/events/[slug]` — individual event pages with `#tickets` anchor working on all city pages
- [x] `/login` — with `?email=` and `?redirect=` URL param support + Suspense wrapper
- [x] `/signup`
- [x] `/account` — order history, QR tickets
- [x] `/ticket-confirmation` — post-Stripe success page, prefills login link with customer email
- [x] `/contact` — contact form (saves to Supabase `contact_submissions`)
- [x] `/affiliates`
- [x] `/vendors`
- [x] `/press`
- [x] `/sponsors`
- [x] `/forgot-password`
- [x] `/admin` — full admin dashboard
- [x] `/blog`

### Ticket Purchase Flow
- [x] `TicketCartModal.tsx` — ticket purchase modal (Turnstile removed)
- [x] `PreCheckoutModal.tsx` — pre-checkout info collection (Turnstile removed)
- [x] Stripe Checkout Session creation via `/api/pre-checkout`
- [x] Stripe webhook handler — order creation, QR ticket generation, auth account creation, email
- [x] Service fee shown as "Service Fee" only (no breakdown description)

### Email System
- [x] Resend domain `mail.tequilafestusa.com` verified
- [x] New Resend API key configured (old one was revoked)
- [x] Combined ticket email: QR codes + order summary + account credentials in one email
- [x] Account auto-creation on purchase (checks `customer_accounts` table, not `listUsers()`)
- [x] Admin resend-email endpoint updated to use new combined template
- [x] Admin inbox reads from Supabase via `/api/admin/contact` (not direct `supabaseAdmin` in client)
- [x] "Resend Ticket Email" button in Orders section fully wired up

### Bug Fixes Applied
- [x] Cloudflare Turnstile spinning loop — removed from all forms
- [x] Stripe webhook 308 redirect — updated webhook URL to www
- [x] All site links updated from `tequila-fest-usa.vercel.app` to `www.tequilafestusa.com`
- [x] `useSearchParams()` Suspense boundary added to login page
- [x] Admin inbox showing empty — fixed `supabaseAdmin` in client component bug
- [x] Two back-to-back emails to same recipient — merged into one email
- [x] `listUsers()` pagination limit bug — replaced with direct DB lookup

---

## What Still Needs to Be Done

### High Priority
- [ ] **Send ticket emails to 2 VIP customers** whose emails were never sent before the system was fixed:
  - `TF-MQ4J7CXY` — Dalton Lobenstein — `daltonobenstein@gmail.com` — Cincinnati VIP — $131.92
  - `TF-MQ4J86AD` — Jon Osman — `jonnyosman98@gmail.com` — Cincinnati VIP — $131.92
  - Use the **Resend Ticket Email (Send icon)** button in Admin → Orders
- [ ] **Coupon/promo codes** at checkout — table exists in DB, UI and API not built
- [ ] **Security audit / Supabase RLS** — Row Level Security policies need review on all tables

### Medium Priority
- [ ] **Stripe receipt link** on account page — currently not shown
- [ ] **Email blast to Cincinnati ticket holders** — announce event details / day-of info
- [ ] **City-specific logos** on each event page — currently using generic logo
- [ ] **Check-in / QR scanner page** (`/check-in`) — for door staff to scan tickets
- [ ] **Loyalty/points system** — DB table exists, no UI or award logic beyond comment placeholder
- [ ] **Social feed** — not yet built
- [ ] **Sponsor portal** — not yet built
- [ ] **Brand owner portal** — not yet built
- [ ] **Vendor application flow** — form submits but no review/approval workflow in admin
- [ ] **Push notifications** — VAPID keys exist in env, not wired up
- [ ] **Blog** — page scaffolded, needs CMS/admin editing and content

### Nice to Have
- [ ] **AI auto-reply suggestions** in inbox — OpenAI key exists, partially wired, needs testing
- [ ] **Columbus event page** — city site not yet built at `/Users/adambossin/Sites/tequila-fest-columbus`
- [ ] **Affiliate dashboard** — signup form exists, no dashboard for affiliates to track commissions
- [ ] **Admin analytics** — deeper stats (revenue by city, ticket type breakdown, etc.)

---

## Design System

**Match the Cincinnati/Cleveland city sites exactly** — same fonts, colors, animations.

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

**DO NOT** copy anything referencing: `businesses`, `SedonaPassport`, `Lodging`, `Restaurants`, `ThingsToDo`, `BusinessDetail`, `BusinessMap`, `ClaimListing` — dead code from another project.

### Key Old Files
| File | Purpose |
|---|---|
| `server/routes.ts` | All original API endpoints (~3000 lines) |
| `server/affiliateRoutes.ts` | Affiliate program routes |
| `shared/schema.ts` | Full original database schema (Drizzle) |
| `server/lib/checkoutFollowupEmails.ts` | Post-purchase email flows |
| `server/lib/affiliates.ts` | Affiliate tracking logic |

---

## Important Notes for Next Session

1. **Do not re-enable Turnstile** without extensive testing. It caused a near-total site outage (all forms silently failing). If you add it back, test the checkout flow end-to-end before deploying.

2. **Stripe webhook URL must be exactly `https://www.tequilafestusa.com/api/webhooks/stripe`** — no trailing slash, must include www. Cloudflare redirects bare domain to www with 308 and Stripe does not follow redirects.

3. **Resend API key must be active** — check `https://resend.com/api-keys` if emails stop sending. The previous key was silently revoked. Update `RESEND_API_KEY` in Vercel env and redeploy.

4. **Admin inbox data comes from Supabase `contact_submissions`** — fetched server-side via `/api/admin/contact`. Never import `supabaseAdmin` in a client component — `SUPABASE_SERVICE_ROLE_KEY` is server-only.

5. **All email sends happen in the Stripe webhook** (`src/app/api/webhooks/stripe/route.ts`). Only ONE email is sent per purchase. Do not add additional `resend.emails.send()` calls for the same recipient in the same webhook execution — Resend will silently drop the second one.

6. **Local builds will fail** with `supabaseUrl is required` because Vercel pulls empty strings for secrets. This is expected. Vercel builds pass because secrets are injected at build time. Do not try to fix this locally.
