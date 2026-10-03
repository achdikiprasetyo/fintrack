# 🏛️ FinTrack — Multi-Asset Net Worth Hub & AI Finance Assistant

[![Deno](https://img.shields.io/badge/Runtime-Deno%20v1.40+-000000?logo=deno&logoColor=white)](https://deno.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://aistudio.google.com)
[![Telegram](https://img.shields.io/badge/Bot-Telegram%20Bot%20API-24A1DE?logo=telegram&logoColor=white)](https://telegram.org)
[![Discord](https://img.shields.io/badge/Integration-Discord%20Webhook-5865F2?logo=discord&logoColor=white)](https://discord.com)
[![PWA](https://img.shields.io/badge/Frontend-Vanilla%20PWA%20(Zero--Build)-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**FinTrack** adalah sistem pelacak kekayaan bersih (*Net Worth Tracker*) multi-aset otomatis berskala personal dan keluarga. Sistem ini mengintegrasikan pemantauan saldo dompet perbankan/e-wallet, portofolio reksadana (Bibit), saldo fisik emas (Treasury), kurs live USD/IDR, bukti transfer/QRIS OCR via AI, serta bot Telegram dan notifikasi Discord.

---

## 📁 Struktur Direktori Bersih & Modular (Monorepo)

FinTrack memisahkan tanggung jawab sistem secara ketat (*Separation of Concerns*):

```text
fintrack/
├── server/                     # ⚙️ Backend Deno Runtime (Telegram Bot & AI API)
│   ├── index.ts                # Server API & Telegram Long-Polling Engine
│   ├── sync_market.ts          # Sinkronisasi harga pasar Bibit & Treasury
│   └── fintrack-bot.service    # Unit file systemd untuk background daemon
├── web/                        # 🌐 Frontend Web PWA (Zero-Build Modular Architecture)
│   ├── css/                    # Stylesheet tema gelap, glassy bento, dan komponen
│   │   ├── app.css             # Tema utama FinTrack
│   │   └── vendor.css          # Framework UI styles
│   ├── icons/                  # Aset icon & branding PWA (ringan & teroptimasi)
│   │   ├── favicon.png
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── js/                     # Modul fitur JavaScript terpisah (Modular ES6)
│   │   ├── app-core.js         # Core application logic & state management
│   │   ├── analytics-charts.js # Tab Analisis, KPI cards, ECharts Donut & Bar
│   │   ├── forex-usd.js        # Live Forex interbank USD/IDR rate
│   │   ├── period-filter.js    # Filter periode mutasi (Date range calendar)
│   │   ├── pwa-init.js         # Inisialisasi Service Worker & install PWA
│   │   ├── receipt-scanner.js  # AI Scanner resi transfer/QRIS & Gemini OCR
│   │   ├── receipt-simulation.js # Chip nominal cepat & kalkulator simulasi
│   │   ├── statement-export.js # Generator laporan e-Statement PDF & Excel
│   │   ├── tabs-engine.js      # Navigasi tab geser & animasi kaskade
│   │   ├── toast.js            # Toast notification engine & haptics
│   │   └── ui-enhancers.js     # Speed Dial FAB & Bento switcher
│   ├── vendor/                 # Dependencies lokal berkinerja tinggi (Zero-CDN)
│   │   ├── echarts.min.js      # Apache ECharts
│   │   ├── flatpickr.min.js    # Datepicker kalender mutasi
│   │   ├── flatpickr.dark.min.css
│   │   ├── jspdf.umd.min.js    # Export e-Statement PDF
│   │   ├── jspdf.plugin.autotable.min.js
│   │   └── xlsx.full.min.js    # Export e-Statement Excel (SheetJS)
│   ├── index.html              # Single Page Application entrypoint
│   ├── manifest.webmanifest    # Konfigurasi PWA Web App Manifest
│   └── sw.js                   # Service Worker (Offline Cache & Share Target)
├── database/                   # 🗄️ Basis Data PostgreSQL Supabase
│   └── schema.sql              # Skema tabel, RLS Policies, & data inisialisasi
├── docs/                       # 📚 Dokumentasi Lengkap
│   ├── ARCHITECTURE.md         # Dokumentasi arsitektur sistem & panduan developer
│   └── DEPLOYMENT.md           # Panduan deployment 12-factor ke VPS Linux
├── .env.example                # Template konfigurasi rahasia aman
└── .gitignore                  # Proteksi berkas rahasia & artefak build
```

---

## ⚡ Quick Start (Setup 5 Menit)

### 1. Prasyarat
- [Deno](https://deno.com) (v1.40+)
- Akun [Supabase](https://supabase.com) (Gratis)
- Google AI Studio API Key ([aistudio.google.com](https://aistudio.google.com)) (Gratis)
- Bot Telegram via [@BotFather](https://t.me/BotFather) (Opsional)

---

### 2. Setup Basis Data Supabase
1. Buat proyek baru di **Supabase Dashboard**.
2. Masuk ke menu **SQL Editor**.
3. Buka file [`database/schema.sql`](./database/schema.sql), salin seluruh isinya, lalu klik **Run**.

---

### 3. Konfigurasi Environment (`.env`)
Salin template konfigurasi:
```bash
cp .env.example .env
```
Buka file `.env` dan lengkapi variabel berikut:
```env
# Supabase PostgreSQL
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_supabase_anon_public_key"

# Google Gemini AI (OCR Resi & Natural Language Parser)
GOOGLE_API_KEY="AIzaSyYourApiKeyHere"

# Telegram Bot (Opsional)
TELEGRAM_BOT_TOKEN="your_bot_token"
ALLOWED_TELEGRAM_USER_ID="your_telegram_id"

# Discord Webhook (Opsional)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Server
PORT=8081
APP_NAME="FinTrack"
```

---

### 4. Menjalankan Backend & Bot

Jalankan langsung menggunakan Deno:
```bash
deno run --allow-net --allow-env --env-file=.env server/index.ts
```

Untuk menjalankan sebagai *background daemon* di VPS Linux menggunakan systemd:
```bash
sudo cp server/fintrack-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fintrack-bot
```

Tambahkan cron job sinkronisasi harga pasar otomatis (Bibit & Treasury) setiap jam:
```bash
0 * * * * /usr/local/bin/deno run --allow-net --allow-env --env-file=/home/ubuntu/fintrack-bot/.env /home/ubuntu/fintrack-bot/server/sync_market.ts >> /home/ubuntu/fintrack-bot/sync.log 2>&1
```

---

### 5. Menyajikan Web Frontend (Caddy / Nginx)

Web frontend FinTrack bersifat **Zero-Build** dan menggunakan arsitektur **Runtime Config Injection**. Frontend secara dinamis mengambil konfigurasi Supabase dari backend melalui endpoint `/api/config.js`, sehingga aman di-deploy tanpa hardcoded API keys.

Contoh konfigurasi reverse proxy **Caddy** (`/etc/caddy/Caddyfile`):
```caddy
your-domain.com {
    # Proxy API & Runtime Config ke Backend Deno
    handle /api/* {
        reverse_proxy 127.0.0.1:8081
    }

    # Serve Frontend Web PWA
    handle /finance/* {
        root * /var/www/fintrack
        file_server
        try_files {path} /index.html
    }
}
```

---

## 🛡️ Keamanan & Privasi (Privacy-First)
- **Zero Secrets in Repository**: Tidak ada token bot, kunci API Gemini, atau URL Supabase yang tersimpan di kode sumber repositori.
- **Whitelist ID Telegram**: Bot hanya menerima dan mengeksekusi instruksi dari ID Telegram pemilik akun (`ALLOWED_TELEGRAM_USER_ID`).
- **Dynamic Config Injection**: Kunci Supabase tidak di-hardcode ke bundel static file web, melainkan di-inject saat runtime oleh server.
- **Lazy Loaded Heavy Libraries**: Pustaka berat (jsPDF, SheetJS) hanya diunduh saat pengguna mengklik ekspor e-Statement, menjaga ukuran payload awal super ringan.

---

## 📚 Dokumentasi Lanjutan
- [Panduan Arsitektur & Modul Detail](./docs/ARCHITECTURE.md)
- [Panduan Deployment VPS 12-Factor](./docs/DEPLOYMENT.md)

---

## 📄 Lisensi
MIT License. Bebas digunakan dan dikembangkan untuk keperluan personal maupun komunitas.
