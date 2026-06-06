# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**TequilaFestUSA.com** — The national hub site for Tequila Fest USA, a multi-city tequila festival touring 4 cities in 2026. This is a full rebuild of an existing Replit-based SPA, migrated to a modern stack.

This site handles everything: public marketing, event listings, ticket purchasing (Stripe), user accounts, QR code ticket delivery, affiliate program, admin dashboard, blog, and more.

The city-specific splash sites are **separate projects**:
- `/Users/adambossin/Sites/tequila-fest-cincinnati` — port 4000
- `/Users/adambossin/Sites/tequila-fest-cleveland` — port 4001
- `/Users/adambossin/Sites/tequila-fest-columbus` — port 4003 (not yet built)

This project runs on **port 4002** locally.

---

## Target Architecture

```
TequilaFestUSA.com (Next.js 16, App Router)  →  Vercel
         ↓ API calls (/api/*)
Express Backend (Node.js)                    →  Railway
         ↓ reads/writes
PostgreSQL Database                          →  Supabase
```

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion (same stack as city sites)
- **Backend:** Express.js (ported from Replit — see old codebase below)
- **Database:** Supabase PostgreSQL (schema migrated from Drizzle/Replit)
- **Payments:** Stripe (existing keys, same integration)
- **Email:** Resend
- **AI:** OpenAI (for AI inbox — rebuild from scratch)
- **Push notifications:** Web Push (VAPID)
- **File storage:** Supabase Storage (replacing Replit Object Storage)

---

## Dev Commands

```bash
# Dev server — port 4002 (3000=Willoughby, 4000=Cincinnati, 4001=Cleveland, 4002=USA, 4003=Columbus)
nohup npm run dev -- --port 4002 > /tmp/tequila-usa-dev.log 2>&1 &

# Build
npm run build

# Lint
npm run lint

# Install (npm cache workaround)
npm install --cache /tmp/npm-cache
```

---

## Old Codebase Reference

The original Replit project is archived at:
`/Users/adambossin/Sites/tequila-fest-usa-old/`

**DO NOT** copy the Sedona Passport / business directory code — it's dead code from another project that got mixed in. Ignore everything referencing: `businesses`, `SedonaPassport`, `Lodging`, `Restaurants`, `ThingsToDo`, `BusinessDetail`, `BusinessMap`, `ClaimListing`, `BusinessOwnerDashboard`, `BusinessRegistration`, `BusinessListingPackages`.

### Old Stack
- Frontend: React + Vite SPA (`/client/src/`)
- Backend: Express.js (`/server/routes.ts` — main API file, ~3000 lines)
- Database: PostgreSQL + Drizzle ORM (`/shared/schema.ts`)
- Auth: Session-based (express-session + scrypt password hashing)

### Key Old Files to Reference
| File | Purpose |
|---|---|
| `server/routes.ts` | All API endpoints — read this carefully |
| `server/affiliateRoutes.ts` | Affiliate program routes |
| `shared/schema.ts` | Full database schema (Drizzle) |
| `server/lib/marketingLists.ts` | Brevo/marketing list sync |
| `server/lib/checkoutFollowupEmails.ts` | Post-purchase email flows |
| `server/lib/affiliates.ts` | Affiliate tracking logic |
| `client/src/pages/` | All existing page components for reference |

---

## Live API (Replit — still running during migration)

Base URL: `https://tequila-fest--lifechanging.replit.app`

**Confirmed working endpoints:**
- `GET /api/events` — returns all 4 events with full data

**Auth:** Session-based. Customers and admins use separate session flags (`req.session.customerId` vs `req.session.isAdmin`).

---

## Events (4 Cities)

| City | Date | Venue | Price |
|---|---|---|---|
| Cincinnati | June 13, 2026, 3–9 PM | Fountain Square, Downtown Cincinnati | $75 |
| Cleveland | July 25, 2026, 3–9 PM | Cuyahoga County Fairgrounds, Berea OH | $75 |
| Columbus | Aug 8, 2026, 3–9 PM | Gravity/Greater Columbus Convention Center | $75 |
| Phoenix | Nov 14, 2026, 3–9 PM | Phoenix Convention Center | $85 |

All events: 12 tasting tickets, food, live entertainment, souvenir item. VIP add-on available.

Ticket URLs follow pattern: `https://tequilafestusa.com/events/tequila-fest-{city}-2026`

---

## Database Schema (Key Tables)

From `shared/schema.ts` — migrate these to Supabase:

| Table | Purpose |
|---|---|
| `customerAccounts` | User accounts (email, password hash, profile) |
| `events` | Event listings per city |
| `ticketOrders` | Purchase records, Stripe payment intent IDs |
| `ticketOrderItems` | Line items per order (ticket type, qty, price) |
| `ticketInstances` | Individual tickets with QR codes |
| `coupons` + `couponUses` | Discount codes |
| `affiliates` | Affiliate accounts + commission tracking |
| `blogPosts` | Blog content |
| `socialPosts` / `socialLikes` / `socialComments` | Social feed |
| `loyaltyTransactions` | Points system |
| `bannerSponsors` | Homepage sponsor banner ads |
| `sponsorPackages` | Sponsorship tiers/packages |
| `invoices` + `invoiceItems` | Sponsor invoicing |
| `brandOwners` | Tequila brand partner accounts |
| `contactSubmissions` + `contactSubmissionReplies` | Contact form + AI inbox |
| `mediaUploads` | File/image upload records |
| `socialShareClaims` | Loyalty points for social shares |

**Skip:** `users` (admin only), `businesses`, and anything Sedona-related.

---

## Features to Build

### Phase 1 — Public Frontend (Next.js on Vercel)
- [ ] Homepage — hero, all 4 city event cards, highlights, sponsors
- [ ] `/events` — all events listing page
- [ ] `/events/[slug]` — individual event detail + ticket purchase CTA
- [ ] `/login` + `/signup` — customer auth
- [ ] `/account` — user profile, order history, QR code tickets
- [ ] `/blog` — blog listing + individual posts
- [ ] `/affiliates` — affiliate signup + dashboard
- [ ] `/contact` — contact form
- [ ] `/admin` — admin dashboard (events, orders, users, affiliates, blog, sponsors)
- [ ] `/check-in` — QR scanner for door staff

### Phase 2 — Express Backend (Railway)
- [ ] Port all routes from `server/routes.ts` to Railway Express app
- [ ] Swap Replit Object Storage → Supabase Storage
- [ ] Swap Replit DB → Supabase PostgreSQL
- [ ] Keep Stripe, Resend, OpenAI integrations identical
- [ ] Keep affiliate tracking logic identical

### Phase 3 — Rebuild & Enhance
- [ ] AI inbox (rebuild with OpenAI — contact form replies, auto-responses)
- [ ] Push notifications
- [ ] Social feed
- [ ] Loyalty/points system
- [ ] Sponsor portal
- [ ] Brand owner portal
- [ ] Vendor application flow

---

## Design System

**Match the Cincinnati/Cleveland city sites exactly** — same fonts, colors, animations. Reference `/Users/adambossin/Sites/tequila-fest-cincinnati/src/app/globals.css` as the starting point.

### Colors
| Role | Hex |
|---|---|
| Primary gold/marigold | `#F5A623` |
| Agave red | `#C8102E` |
| Fiesta purple | `#7B2FBE` |
| Cactus green | `#00A878` |
| Dark background | `#0d0500` |
| Cream text | `#FFF8F0` |

### Fonts (Google Fonts)
- **Display/Headlines:** Bebas Neue
- **Subheadings:** Playfair Display
- **Body:** Source Sans 3

### CSS Shimmer Classes (copy from Cincinnati globals.css)
- `.text-shimmer` — gold/red animated gradient
- `.text-shimmer-blue` — light blue/turquoise/navy
- `.text-shimmer-platinum` — silver/white (VIP sections)
- `.animate-pulse-glow` — yellow glow pulse on CTAs
- `.papel-picado-border` — Mexican paper-cut border decoration

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Railway backend URL
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (email)
RESEND_API_KEY=

# OpenAI (AI inbox)
OPENAI_API_KEY=

# Web Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## GitHub + Deployment

- GitHub repo: `kingadam333/tequila-fest-usa` (create this)
- Frontend → Vercel (import from GitHub, auto-deploy on push to main)
- Backend → Railway (separate Express app)
- Database → Supabase (project: "Tequila Fest USA")
- Domain: `tequilafestusa.com`

---

## Starting Point Checklist

Before writing any code:
1. Create Supabase project "Tequila Fest USA"
2. Run schema migration (convert `shared/schema.ts` Drizzle → Supabase SQL)
3. Scaffold Next.js: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack` (use `--cache /tmp/npm-cache` if npm fails)
4. Install deps: `npm install --cache /tmp/npm-cache framer-motion lucide-react @supabase/supabase-js @supabase/ssr clsx tailwind-merge class-variance-authority`
5. Copy `globals.css` from `/Users/adambossin/Sites/tequila-fest-cincinnati/src/app/globals.css` as design foundation
6. Create GitHub repo `tequila-fest-usa` under `kingadam333` and push
7. Build homepage first, then work through feature list above
