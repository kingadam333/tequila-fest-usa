-- ============================================================
-- Events + Ticket Types schema — run in Supabase SQL Editor
-- ============================================================

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  city text not null,
  state text not null,
  title text not null,
  date text not null,
  date_iso timestamptz not null,
  time text not null,
  venue text not null,
  venue_detail text not null,
  venue_address text not null,
  description text,
  color text not null default '#F5A623',
  gradient text,
  tag text,
  emoji text,
  free_parking boolean not null default false,
  capacity integer not null default 500,
  status text not null default 'on_sale'
    check (status in ('draft','on_sale','sold_out','cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  capacity integer not null default 300,
  sold_count integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_ga boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_slug on events(slug);
create index if not exists idx_ticket_types_event on ticket_types(event_id);

alter table events enable row level security;
alter table ticket_types enable row level security;

create policy "Events are publicly readable"
  on events for select using (status != 'draft');

create policy "Ticket types are publicly readable"
  on ticket_types for select using (is_active = true);

-- ── Seed events ──────────────────────────────────────────────
insert into events (slug, city, state, title, date, date_iso, time, venue, venue_detail, venue_address, color, gradient, tag, emoji, free_parking, capacity, status, sort_order) values
(
  'cincinnati',
  'Cincinnati', 'OH',
  'Tequila Fest Cincinnati 2026',
  'June 13, 2026',
  '2026-06-13T15:00:00',
  '3:00 PM – 9:00 PM',
  'Fountain Square',
  'Downtown Cincinnati',
  '520 Vine St, Cincinnati, OH 45202',
  '#F5A623',
  'from-yellow-900/60 to-orange-950/80',
  'Flagship City', '🏙️',
  false, 500, 'on_sale', 1
),
(
  'cleveland',
  'Cleveland', 'OH',
  'Tequila Fest Cleveland 2026',
  'July 25, 2026',
  '2026-07-25T15:00:00',
  '3:00 PM – 9:00 PM',
  'Cuyahoga County Fairgrounds',
  'Berea, OH',
  'Cuyahoga County Fairgrounds, Berea, OH 44017',
  '#C8102E',
  'from-red-900/60 to-rose-950/80',
  'Lake Erie Edition', '🌊',
  true, 800, 'on_sale', 2
),
(
  'columbus',
  'Columbus', 'OH',
  'Tequila Fest Columbus 2026',
  'August 8, 2026',
  '2026-08-08T15:00:00',
  '3:00 PM – 9:00 PM',
  'Gravity / Greater Columbus Convention Center',
  'Downtown Columbus',
  '400 N High St, Columbus, OH 43215',
  '#00A878',
  'from-emerald-900/60 to-teal-950/80',
  'Capital City', '🌿',
  false, 600, 'on_sale', 3
),
(
  'phoenix',
  'Phoenix', 'AZ',
  'Tequila Fest Phoenix 2026',
  'November 14, 2026',
  '2026-11-14T15:00:00',
  '3:00 PM – 9:00 PM',
  'Phoenix Convention Center',
  'Downtown Phoenix',
  '100 N 3rd St, Phoenix, AZ 85004',
  '#7B2FBE',
  'from-purple-900/60 to-violet-950/80',
  'Desert Edition', '🌵',
  true, 1000, 'on_sale', 4
)
on conflict (slug) do nothing;

-- ── Seed ticket types ────────────────────────────────────────
-- Cincinnati
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Early Bird', 55.00, 300, 150, 1, false from events where slug='cincinnati'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Regular Rate', 60.00, 400, 34, 2, false from events where slug='cincinnati'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Late Registration', 65.00, 200, 1, 3, false from events where slug='cincinnati'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'VIP Experience', 125.00, 100, 56, 4, false from events where slug='cincinnati'
on conflict do nothing;

-- Cleveland
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Early Bird', 55.00, 300, 37, 1, false from events where slug='cleveland'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Regular Rate', 60.00, 400, 1, 2, false from events where slug='cleveland'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Late Registration', 65.00, 100, 0, 3, false from events where slug='cleveland'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'VIP Experience', 125.00, 75, 7, 4, false from events where slug='cleveland'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'GA', 5.00, 100, 4, 5, true from events where slug='cleveland'
on conflict do nothing;

-- Columbus
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Early Bird', 55.00, 300, 0, 1, false from events where slug='columbus'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Regular Rate', 60.00, 400, 0, 2, false from events where slug='columbus'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Late Registration', 65.00, 100, 0, 3, false from events where slug='columbus'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'VIP Experience', 125.00, 75, 0, 4, false from events where slug='columbus'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'GA', 5.00, 100, 0, 5, true from events where slug='columbus'
on conflict do nothing;

-- Phoenix
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Early Bird', 55.00, 300, 0, 1, false from events where slug='phoenix'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Regular Rate', 60.00, 400, 0, 2, false from events where slug='phoenix'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'Late Registration', 65.00, 100, 0, 3, false from events where slug='phoenix'
on conflict do nothing;
insert into ticket_types (event_id, name, price, capacity, sold_count, sort_order, is_ga)
select id, 'VIP Experience', 125.00, 100, 0, 4, false from events where slug='phoenix'
on conflict do nothing;
