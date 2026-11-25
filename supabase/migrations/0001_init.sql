-- =====================================================================
-- FoundX - Campus Lost and Found Portal
-- Migration 0001: schema, enums, triggers, indexes, RLS, storage bucket
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- It is idempotent: safe to re-run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Enumerated types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role    as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_type as enum ('lost', 'found');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_status  as enum ('open', 'claimed', 'resolved', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('claim_received', 'claim_approved', 'claim_rejected', 'item_resolved', 'duplicate_alert', 'system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. profiles  (1 row per auth.users row, created by trigger)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'Student',
  email       text not null,
  roll_number text,
  department  text,
  phone       text,
  role        public.user_role not null default 'student',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Application user profile linked 1:1 to auth.users';

-- ---------------------------------------------------------------------
-- 3. categories  (reference data, seeded in 0002_seed.sql)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         serial primary key,
  name       text not null unique,
  slug       text not null unique,
  icon       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. items  (lost / found listings)
-- ---------------------------------------------------------------------
create table if not exists public.items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  category_id     integer references public.categories (id) on delete set null,
  title           text not null check (char_length(title) between 3 and 120),
  description     text not null check (char_length(description) between 5 and 2000),
  listing_type    public.listing_type not null,
  status          public.item_status not null default 'open',
  location        text not null,
  campus_building text,
  event_date      date not null,
  image_url       text,
  contact_info    text,
  views           integer not null default 0,
  search_vector   tsvector generated always as (
                    to_tsvector('english',
                      coalesce(title, '') || ' ' ||
                      coalesce(description, '') || ' ' ||
                      coalesce(location, ''))
                  ) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.items is 'Lost and found item reports';

create index if not exists items_created_at_idx  on public.items (created_at desc);
create index if not exists items_type_idx        on public.items (listing_type);
create index if not exists items_status_idx      on public.items (status);
create index if not exists items_category_idx    on public.items (category_id);
create index if not exists items_building_idx    on public.items (campus_building);
create index if not exists items_user_idx        on public.items (user_id);
create index if not exists items_search_idx      on public.items using gin (search_vector);

-- ---------------------------------------------------------------------
-- 5. claims  (a claim is raised by a finder/owner against a listing)
-- ---------------------------------------------------------------------
create table if not exists public.claims (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.items (id) on delete cascade,
  claimant_id      uuid not null references public.profiles (id) on delete cascade,
  message          text not null check (char_length(message) between 10 and 1000),
  proof_description text,
  contact_info     text,
  status           public.claim_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint claims_unique_per_user unique (item_id, claimant_id)
);

comment on table public.claims is 'Ownership claims submitted against an item';

create index if not exists claims_item_idx     on public.claims (item_id);
create index if not exists claims_claimant_idx on public.claims (claimant_id);
create index if not exists claims_status_idx   on public.claims (status);

-- ---------------------------------------------------------------------
-- 6. notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null default 'system',
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------
-- 7. Helper functions
-- ---------------------------------------------------------------------

-- Keeps updated_at current on any UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Creates a profile row whenever a new Supabase Auth user is created.
-- Reads full_name / roll_number / department / phone from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, roll_number, department, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'roll_number', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- True when the calling user is an administrator (used by RLS policies).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Row Level Security
--    The Express API talks to Postgres with the service_role key, so it
--    enforces authorisation in middleware. These policies are the second
--    line of defence: they protect the database if the anon key is ever
--    used directly from a browser or a leaked token.
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.items         enable row level security;
alter table public.claims        enable row level security;
alter table public.notifications enable row level security;

-- profiles
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- categories: readable by everyone, writable by admins
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- items: public read, owner write, admin override
drop policy if exists items_select_all on public.items;
create policy items_select_all on public.items
  for select using (true);

drop policy if exists items_insert_own on public.items;
create policy items_insert_own on public.items
  for insert with check (auth.uid() = user_id);

drop policy if exists items_update_own on public.items;
create policy items_update_own on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists items_delete_own on public.items;
create policy items_delete_own on public.items
  for delete using (auth.uid() = user_id);

drop policy if exists items_admin_all on public.items;
create policy items_admin_all on public.items
  for all using (public.is_admin()) with check (public.is_admin());

-- claims: visible to the claimant, the item owner and admins
drop policy if exists claims_select_related on public.claims;
create policy claims_select_related on public.claims
  for select using (
    auth.uid() = claimant_id
    or public.is_admin()
    or exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );

drop policy if exists claims_insert_own on public.claims;
create policy claims_insert_own on public.claims
  for insert with check (auth.uid() = claimant_id);

drop policy if exists claims_update_owner_or_admin on public.claims;
create policy claims_update_owner_or_admin on public.claims
  for update using (
    public.is_admin()
    or auth.uid() = claimant_id
    or exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  );

-- notifications: strictly per user
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 9. Storage bucket for item photos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists item_images_public_read on storage.objects;
create policy item_images_public_read on storage.objects
  for select using (bucket_id = 'item-images');

drop policy if exists item_images_auth_insert on storage.objects;
create policy item_images_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists item_images_owner_update on storage.objects;
create policy item_images_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'item-images' and owner = auth.uid());

drop policy if exists item_images_owner_delete on storage.objects;
create policy item_images_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- 10. Admin statistics view (used by the admin dashboard, Phase 4)
-- ---------------------------------------------------------------------
create or replace view public.admin_stats as
select
  (select count(*) from public.items)                                          as total_items,
  (select count(*) from public.items where listing_type = 'lost')               as lost_items,
  (select count(*) from public.items where listing_type = 'found')              as found_items,
  (select count(*) from public.items where status = 'resolved')                 as resolved_items,
  (select count(*) from public.items where status = 'open')                     as open_items,
  (select count(*) from public.claims)                                          as total_claims,
  (select count(*) from public.claims where status = 'pending')                 as pending_claims,
  (select count(*) from public.profiles)                                        as total_users;

grant select on public.admin_stats to authenticated, service_role;
