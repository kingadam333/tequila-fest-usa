-- ============================================================
-- Tequila Fest USA — Supabase Schema
-- Run this in Supabase SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Customer Accounts ───────────────────────────────────────
create table if not exists customer_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  first_name text,
  last_name text,
  phone text,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Ticket Orders ───────────────────────────────────────────
create table if not exists ticket_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references customer_accounts(id),
  customer_email text not null,
  customer_name text not null,
  event_slug text not null,
  event_city text not null,
  ticket_type text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon_code text,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','cancelled','refunded','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Ticket Instances (individual QR tickets) ────────────────
create table if not exists ticket_instances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references ticket_orders(id),
  ticket_number integer not null default 1,
  customer_id uuid references customer_accounts(id),
  event_slug text not null,
  event_city text not null,
  ticket_type text not null,
  holder_name text not null,
  qr_code text not null unique,
  status text not null default 'valid'
    check (status in ('valid','used','cancelled','refunded')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Coupons ─────────────────────────────────────────────────
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage','fixed')),
  value numeric(10,2) not null,
  max_uses integer,
  uses integer not null default 0,
  max_uses_per_customer integer not null default 1,
  min_order_amount numeric(10,2),
  max_discount_amount numeric(10,2),
  applicable_cities text[],
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Loyalty Transactions ────────────────────────────────────
create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id),
  action_code text not null,
  points integer not null,
  description text,
  source_id text,
  source_type text,
  created_at timestamptz not null default now()
);

-- ─── Media Uploads (Dropbox) ─────────────────────────────────
create table if not exists media_uploads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_accounts(id),
  event_id text,
  media_type text not null check (media_type in ('photo','video')),
  file_name text not null,
  dropbox_path text not null,
  file_size integer,
  caption text,
  points_awarded integer not null default 0,
  status text not null default 'approved'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ─── Social Share Claims ─────────────────────────────────────
create table if not exists social_share_claims (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_accounts(id),
  customer_email text not null,
  platform text not null,
  post_url text not null,
  event_id text,
  points_awarded integer not null default 75,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ─── Contact Submissions ─────────────────────────────────────
create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new'
    check (status in ('new','read','replied','closed')),
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Newsletter Subscribers ──────────────────────────────────
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  email text not null unique,
  phone text,
  subscribed_at timestamptz not null default now(),
  active boolean not null default true
);

-- ─── Affiliates ──────────────────────────────────────────────
create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  referral_code text not null unique,
  commission_rate numeric(4,3) not null default 0.10,
  status text not null default 'pending'
    check (status in ('pending','active','revoked')),
  payout_method text,
  payout_details text,
  total_clicks integer not null default 0,
  total_referrals integer not null default 0,
  total_earnings numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  referral_code text not null,
  ip_address text,
  user_agent text,
  utm_source text,
  created_at timestamptz not null default now()
);

-- ─── Blog Posts ──────────────────────────────────────────────
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  body text not null,
  category text not null,
  author text not null default 'Tequila Fest USA',
  image_url text,
  image_alt text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default true,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Banner Sponsors ─────────────────────────────────────────
create table if not exists banner_sponsors (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  tagline text,
  tier text not null default 'presenting',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists idx_ticket_orders_email on ticket_orders(customer_email);
create index if not exists idx_ticket_orders_stripe_session on ticket_orders(stripe_session_id);
create index if not exists idx_ticket_orders_event_city on ticket_orders(event_city);
create index if not exists idx_ticket_orders_status on ticket_orders(status);
create index if not exists idx_ticket_orders_created_at on ticket_orders(created_at desc);
create index if not exists idx_ticket_instances_order on ticket_instances(order_id);
create index if not exists idx_ticket_instances_qr on ticket_instances(qr_code);
create index if not exists idx_loyalty_customer on loyalty_transactions(customer_id);
create index if not exists idx_affiliates_code on affiliates(referral_code);
create index if not exists idx_contact_status on contact_submissions(status);
create index if not exists idx_blog_slug on blog_posts(slug);
create index if not exists idx_blog_published on blog_posts(published, published_at desc);

-- ─── Row Level Security ──────────────────────────────────────
alter table customer_accounts enable row level security;
alter table ticket_orders enable row level security;
alter table ticket_instances enable row level security;
alter table loyalty_transactions enable row level security;
alter table media_uploads enable row level security;
alter table social_share_claims enable row level security;
alter table contact_submissions enable row level security;
alter table newsletter_subscribers enable row level security;
alter table affiliates enable row level security;
alter table affiliate_clicks enable row level security;
alter table coupons enable row level security;
alter table blog_posts enable row level security;
alter table banner_sponsors enable row level security;

-- Public read for blog posts and coupons
create policy "Blog posts are publicly readable"
  on blog_posts for select using (published = true);

create policy "Active coupons are readable"
  on coupons for select using (active = true);

create policy "Active banner sponsors are readable"
  on banner_sponsors for select using (active = true);

-- Service role has full access (used by our API routes via supabaseAdmin)
-- No additional policies needed — service_role bypasses RLS by default
