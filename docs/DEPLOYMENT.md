# 🏛️ FinTrack — Architecture & Deployment Guide (12-Factor Best Practice)

Panduan resmi untuk developer atau pemilik baru dalam men-deploy dan mengonfigurasi **FinTrack Bot & Web Hub** dari nol secara bersih, aman, dan standar industri.

---

## 📌 1. Prinsip Arsitektur (Separation of Concerns)

FinTrack memisahkan tanggung jawab sistem secara tegas mengikuti prinsip **12-Factor App**:

1. **Konfigurasi & Rahasia (100% di `.env`)**:
   - Token Bot Telegram, Google API Key, Kunci Supabase, dan Whitelist User ID disimpan eksklusif di file `.env`.
   - **Zero Hardcoding**: Tidak ada token atau kunci rahasia yang tertulis di kode sumber (`index.ts`).
2. **Data & State Aplikasi (100% di Supabase)**:
   - Saldo dompet, riwayat transaksi, gram emas Treasury, produk portofolio Bibit, dan sesi interaktif wizard disimpan di Supabase PostgreSQL.
3. **Bot Execution (Long-Polling via Systemd)**:
   - Bot berjalan independen via Deno runtime dengan mode **Long-Polling** (`getUpdates`). Bebas ribet konfigurasi domain SSL Webhook Telegram.
4. **Web Frontend (Modular Static Hub via Caddy)**:
   - File HTML, CSS, dan modul JavaScript fitur terpisah di `/var/www/fintrack/` yang disajikan via Caddy web server dengan HTTP/2 & PWA offline cache.

---

## 🚀 2. Panduan Setup & Deploy 5 Menit

### Langkah 1: Siapkan Environment (.env)
Salin template konfigurasi resmi:
```bash
cp /home/ubuntu/fintrack-bot/.env.example /home/ubuntu/fintrack-bot/.env
```
Buka dan isi variabel berikut:
```env
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ" # Dari @BotFather
ALLOWED_TELEGRAM_USER_ID="1234567890"                       # Dari @userinfobot
GOOGLE_API_KEY="AIzaSy..."                                   # Dari Google AI Studio
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
PORT=8081
```

---

### Langkah 2: Setup Database Supabase
Buka **Supabase Dashboard -> SQL Editor**, lalu jalankan skrip SQL berikut untuk membuat tabel dan skema:

```sql
-- 1. Tabel Utama FinTrack State (Dompet, Transaksi, Portofolio Investasi)
create table if not exists public.fintrack_app_state (
  id text primary key default 'default_user',
  wallets jsonb default '[]'::jsonb,
  transactions jsonb default '[]'::jsonb,
  investments jsonb default '{"treasury": {"grams": 0, "buyPrice": 0, "sellPrice": 0}}'::jsonb,
  bibit_assets jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Inisialisasi baris pertama default_user jika belum ada
insert into public.fintrack_app_state (id, wallets, transactions, investments, bibit_assets)
values (
  'default_user',
  '[{"id": "w1", "name": "SeaBank", "balance": 0}, {"id": "w2", "name": "ATM BCA", "balance": 0}, {"id": "w3", "name": "Cash", "balance": 0}]'::jsonb,
  '[]'::jsonb,
  '{"treasury": {"grams": 0, "buyPrice": 0, "sellPrice": 0}}'::jsonb,
  '[]'::jsonb
)
on conflict (id) do nothing;

-- 2. Tabel Sesi Percakapan Multi-Step Bot Telegram
create table if not exists public.telegram_bot_sessions (
  chat_id text primary key,
  state jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Row Level Security (RLS)
alter table public.fintrack_app_state enable row level security;
alter table public.telegram_bot_sessions enable row level security;

create policy "Allow all access to fintrack_app_state" on public.fintrack_app_state for all using (true) with check (true);
create policy "Allow all access to telegram_bot_sessions" on public.telegram_bot_sessions for all using (true) with check (true);
```

---

### Langkah 3: Jalankan Service Bot (Systemd)
Pastikan service systemd aktif dan otomatis menyala saat server reboot:

File `/etc/systemd/system/fintrack-bot.service`:
```ini
[Unit]
Description=FinTrack Telegram Bot & AI API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/fintrack-bot
ExecStart=/usr/local/bin/deno run --allow-net --allow-env --env-file=/home/ubuntu/fintrack-bot/.env /home/ubuntu/fintrack-bot/server/index.ts
Restart=always
RestartSec=5
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
```

Jalankan perintah:
```bash
sudo cp /home/ubuntu/fintrack-bot/server/fintrack-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fintrack-bot.service
sudo systemctl status fintrack-bot.service
```

Tambahkan jadwal sinkronisasi harga pasar otomatis (Bibit & Treasury) via crontab:
```bash
crontab -e
# Tambahkan baris berikut (sinkronisasi setiap 1 jam sekali):
0 * * * * /usr/local/bin/deno run --allow-net --allow-env --env-file=/home/ubuntu/fintrack-bot/.env /home/ubuntu/fintrack-bot/server/sync_market.ts >> /home/ubuntu/fintrack-bot/sync.log 2>&1
```

---

### Langkah 4: Konfigurasi Web Server (Caddy)
Tambahkan blok ini pada `/etc/caddy/Caddyfile`:

```caddy
arazy.my.id {
    # Reverse Proxy untuk AI Scanner API dari Web
    handle /api/parse-transaction* {
        reverse_proxy 127.0.0.1:8081
    }

    # Redirect /finance ke /finance/
    redir /finance /finance/

    # Web App FinTrack
    handle_path /finance/* {
        root * /var/www/fintrack
        file_server
        try_files {path} /index.html
    }
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## 🛡️ 3. Fitur Keamanan Bawaan (Built-in Security)
* **Whitelisted Telegram User**: Bot otomatis menolak (`403 Forbidden`) chat atau tombol dari siapa pun kecuali Telegram User ID yang terdaftar di `ALLOWED_TELEGRAM_USER_ID`.
* **Zero Secrets in Code**: File repository aman untuk di-push ke Git publik karena seluruh kredensial terisolasi di `.env` (pastikan `.gitignore` menyertakan `.env`).
* **Atomic State Persistence**: Setiap mutasi langsung di-upsert ke Supabase dengan jaminan integritas data.
