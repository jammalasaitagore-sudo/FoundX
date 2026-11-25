-- =====================================================================
-- FoundX - Migration 0002: reference data (categories)
-- Run after 0001_init.sql. Idempotent.
-- =====================================================================

insert into public.categories (name, slug, icon) values
  ('Electronics',            'electronics',     'laptop'),
  ('ID Cards & Documents',   'documents',       'id-card'),
  ('Books & Stationery',     'books',           'book'),
  ('Clothing & Accessories', 'clothing',        'shirt'),
  ('Keys & Wallets',         'keys-wallets',    'key'),
  ('Bags & Backpacks',       'bags',            'backpack'),
  ('Sports Equipment',       'sports',          'dumbbell'),
  ('Water Bottles & Flasks', 'bottles',         'bottle'),
  ('Others',                 'others',          'box')
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon;
