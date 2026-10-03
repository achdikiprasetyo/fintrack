-- ========================================================
-- 🏛️ FINTRACK DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> Run
-- ========================================================

-- 1. Tabel Utama FinTrack State (Dompet, Transaksi, Portofolio Investasi)
create table if not exists public.fintrack_app_state (
  id text primary key default 'default_user',
  wallets jsonb default '[]'::jsonb,
  transactions jsonb default '[]'::jsonb,
  investments jsonb default '{"treasury": {"grams": 0, "buyPrice": 0, "sellPrice": 0}}'::jsonb,
  bibit_assets jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Inisialisasi baris pertama default_user jika tabel baru dibuat
insert into public.fintrack_app_state (id, wallets, transactions, investments, bibit_assets)
values (
  'default_user',
  '[{"id": "w1", "name": "SeaBank", "balance": 0}, {"id": "w2", "name": "ATM BCA", "balance": 0}, {"id": "w3", "name": "DANA", "balance": 0}]'::jsonb,
  '[]'::jsonb,
  '{"treasury": {"grams": 0, "buyPrice": 0, "sellPrice": 0}}'::jsonb,
  '[]'::jsonb
)
on conflict (id) do nothing;

-- 2. Tabel Sesi Percakapan Multi-Step Bot Telegram (Wizard)
create table if not exists public.telegram_bot_sessions (
  chat_id text primary key,
  state jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Row Level Security (RLS) Configuration
alter table public.fintrack_app_state enable row level security;
alter table public.telegram_bot_sessions enable row level security;

-- Drop policies jika sudah pernah dibuat sebelumnya
drop policy if exists "Allow all access to fintrack_app_state" on public.fintrack_app_state;
drop policy if exists "Allow all access to telegram_bot_sessions" on public.telegram_bot_sessions;

-- Policy untuk mode personal self-hosted
create policy "Allow all access to fintrack_app_state"
  on public.fintrack_app_state
  for all
  using (true)
  with check (true);

create policy "Allow all access to telegram_bot_sessions"
  on public.telegram_bot_sessions
  for all
  using (true)
  with check (true);
