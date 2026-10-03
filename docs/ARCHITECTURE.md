# FinTrack Web Architecture & Developer / AI Guide

Dokumentasi arsitektur ini dibuat untuk memandu developer dan **AI Coding Agent** agar dapat langsung menargetkan file yang tepat dalam hitungan detik.

## 📁 Struktur Direktori & Modul

Aplikasi FinTrack diorganisir secara modular (Monorepo):

```text
fintrack/
├── server/                     # Backend Deno Runtime (Telegram Bot & AI API)
│   ├── index.ts                # Server API & Telegram Long-Polling Engine
│   ├── sync_market.ts          # Sinkronisasi pasar reksadana Bibit & Treasury emas
│   └── fintrack-bot.service    # Unit file systemd untuk daemon background
├── database/                   # Skema Basis Data PostgreSQL Supabase
│   └── schema.sql              # Tabel, RLS Policies, & data inisialisasi
├── docs/                       # Dokumentasi arsitektur dan deployment
│   ├── ARCHITECTURE.md         # Panduan struktur dan modul sistem
│   └── DEPLOYMENT.md           # Panduan deployment 12-factor ke VPS
└── web/                        # Frontend Web PWA (Zero-build Vanilla Modular JS)
    ├── css/                    # Stylesheet tema gelap, glassy bento, dan komponen
    │   ├── app.css             # Tema utama FinTrack
    │   └── vendor.css          # Framework UI styles
    ├── icons/                  # Aset icon & branding PWA
    │   ├── favicon.png
    │   ├── apple-touch-icon.png
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── vendor/                 # Dependencies lokal berkinerja tinggi (Zero-CDN)
    │   ├── echarts.min.js      # Apache ECharts
    │   ├── flatpickr.min.js    # Datepicker kalender mutasi
    │   ├── flatpickr.dark.min.css
    │   ├── jspdf.umd.min.js    # Export e-Statement PDF
    │   ├── jspdf.plugin.autotable.min.js
    │   └── xlsx.full.min.js    # Export e-Statement Excel (SheetJS)
    ├── js/                     # Modul fitur JavaScript terpisah (Modular ES6)
    │   ├── app-core.js         # Core application logic & state management
    │   ├── toast.js            # Toast notification engine & haptics
    │   ├── pwa-init.js         # Inisialisasi Service Worker & dialog install PWA
    │   ├── forex-usd.js        # Live Forex interbank USD/IDR rate & ekuivalensi
    │   ├── analytics-charts.js # Tab Analisis, KPI cards, ECharts Donut & Timeline Bar
    │   ├── tabs-engine.js      # Navigasi tab "geser-geser" & animasi kartu kaskade
    │   ├── receipt-simulation.js # Chip nominal cepat & simulasi saldo live
    │   ├── receipt-scanner.js  # AI Scanner resi kamera/galeri, OCR, & Gemini backend
    │   ├── ui-enhancers.js     # Speed Dial FAB, switcher Bento/List dompet, badge networth
    │   ├── period-filter.js    # Filter periode mutasi (Flatpickr range calendar)
    │   └── statement-export.js # Generator PDF resmi & Excel (Lazy-loaded)
    ├── index.html              # Kerangka utama HTML (~490 baris) & Dialog Modals
    ├── manifest.webmanifest    # Konfigurasi PWA Web App Manifest
    └── sw.js                   # Service Worker (PWA offline cache & Web Share Target)
```

## 🎯 Panduan Cepat untuk AI / Developer

| Kebutuhan Modifikasi | File Target | Ukuran File |
| :--- | :--- | :---: |
| **Ubah tata letak HTML / Modal popup baru** | `index.html` | ~490 baris |
| **Ubah warna, kartu, font, atau animasi CSS** | `app.css` | - |
| **Ubah scan resi bukti bayar / kamera / AI** | `js/receipt-scanner.js` | ~600 baris |
| **Ubah grafik ECharts, arus kas, donat, KPI** | `js/analytics-charts.js` | ~1500 baris |
| **Ubah download PDF e-Statement / Excel** | `js/statement-export.js` | ~680 baris |
| **Ubah kalender filter tanggal mutasi** | `js/period-filter.js` | ~220 baris |
| **Ubah tombol melayang (+) / Bento dompet** | `js/ui-enhancers.js` | ~280 baris |
| **Ubah transisi geser tab / bottom bar** | `js/tabs-engine.js` | ~230 baris |
| **Ubah notifikasi toast pesan sukses** | `js/toast.js` | ~240 baris |

## 🚀 Keunggulan Arsitektur Ini
1. **Zero-Compile / Zero-Build**: Tidak perlu `npm run build` yang lambat atau boros memori VPS.
2. **Instant Hot-Reload**: Setiap perubahan di salah satu file langsung aktif di browser tanpa menunggu.
3. **AI-Friendly**: File berukuran kecil (200–700 baris) pas dalam 1 pembacaan *context window* AI, mencegah error pemotongan kode.
