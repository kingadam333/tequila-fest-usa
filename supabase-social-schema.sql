-- Social Share module schema
-- Run in Supabase SQL editor

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  fb_page_id text not null,
  fb_page_name text,
  fb_page_access_token text not null,
  ig_user_id text,
  dropbox_city_folder text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists social_accounts_city_unique on social_accounts(city);

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  city text,
  platform text not null,             -- 'facebook' | 'instagram'
  post_type text not null,            -- 'event' | 'brand' | 'meme' | 'manual'
  caption text,
  asset_path text,                    -- dropbox path used (if any)
  asset_url text,                     -- temp/public URL used
  external_post_id text,              -- FB/IG returned id
  status text not null default 'posted',  -- posted | failed | scheduled
  error text,
  scheduled_for timestamptz,
  posted_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists social_posts_asset_idx on social_posts(asset_path);
create index if not exists social_posts_type_idx on social_posts(post_type, posted_at desc);

create table if not exists social_settings (
  id int primary key default 1,
  brands_folder text default '/brands',
  memes_folder text default '/memes',
  cities_folder_root text default '/cities',
  auto_post_enabled boolean default false,
  default_brand_caption_tone text default 'fun, energetic, tequila festival vibes',
  updated_at timestamptz default now()
);
insert into social_settings (id) values (1) on conflict do nothing;
