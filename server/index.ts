import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncMarketData } from "./sync_market.ts";

// ==========================================
// ENVIRONMENT VARIABLES & CONFIGURATION
// ==========================================
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ [FATAL CONFIG]: TELEGRAM_BOT_TOKEN belum diset di .env!");
}
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ [FATAL CONFIG]: SUPABASE_URL atau SUPABASE_ANON_KEY belum diset di .env!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// DISCORD WEBHOOK INTEGRATION
// ==========================================
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";

export async function sendDiscordNotification(payload: {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
}) {
  if (!DISCORD_WEBHOOK_URL || !DISCORD_WEBHOOK_URL.startsWith("http")) return;
  try {
    const embed: any = {
      title: payload.title,
      color: payload.color ?? 0x3b82f6,
      timestamp: new Date().toISOString(),
      footer: { text: payload.footer || "FinTrack • Multi-Asset Net Worth Hub" }
    };
    if (payload.description) embed.description = payload.description;
    if (payload.fields && payload.fields.length > 0) embed.fields = payload.fields;

    const body = {
      username: Deno.env.get("APP_NAME") || "FinTrack Hub",
      avatar_url: "https://arazy.my.id/finance/icon-192.png",
      embeds: [embed]
    };

    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.warn("[Discord Webhook] Respons non-OK:", res.status);
    }
  } catch (err: any) {
    console.warn("[Discord Webhook Error]:", err.message || err);
  }
}

function formatIDR(num: number): string {
  return "Rp " + Math.round(num || 0).toLocaleString("id-ID");
}

function formatWIB(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7));
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${wib.getDate()} ${months[wib.getMonth()]} ${wib.getFullYear()}, ${String(wib.getHours()).padStart(2, "0")}:${String(wib.getMinutes()).padStart(2, "0")} WIB`;
  } catch {
    return String(dateInput);
  }
}

const CHECKMARK_GIF = "BQACAgQAAxkDAAOCasD85CrVCDwxFPdSfklBNPdtmkEAAu4LAAL3agxSwpEnUlzIJH09BA";
const COINS_GIF = "CgACAgQAAxkDAAODasD89PdfzvfepY8aOsnMtBu5GiAAAjwLAALHVg1S673qKOL6hR89BA";

function escapeHtml(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function makeProgressBar(percentage: number, length = 8): string {
  const p = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return "▰".repeat(filled) + "▱".repeat(empty);
}

async function setReaction(chatId: number | string, messageId?: number, emoji = "⚡") {
  if (!messageId) return;
  try {
    await fetch(`${TELEGRAM_API}/setMessageReaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: "emoji", emoji }]
      })
    });
  } catch (_err) {
    // Non-critical
  }
}

async function sendOrEdit(chatId: number | string, text: string, replyMarkup?: any, messageId?: number) {
  try {
    const method = messageId ? "editMessageText" : "sendMessage";
    const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
    if (messageId) body.message_id = messageId;
    if (replyMarkup) body.reply_markup = replyMarkup;

    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error("sendOrEdit error:", err);
  }
}

async function sendAnimationOrEdit(
  chatId: number | string,
  animUrlOrId: string,
  caption: string,
  replyMarkup?: any,
  messageIdToReplace?: number
) {
  try {
    if (messageIdToReplace) {
      fetch(`${TELEGRAM_API}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageIdToReplace })
      }).catch(() => {});
    }

    // Telegram caption limit is 1024 characters
    if (caption.length <= 1000) {
      const body: any = {
        chat_id: chatId,
        animation: animUrlOrId,
        caption,
        parse_mode: "HTML"
      };
      if (replyMarkup) body.reply_markup = replyMarkup;

      const res = await fetch(`${TELEGRAM_API}/sendAnimation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.ok) return json;
      console.warn("[Bot Animation] Failed, falling back to text:", json?.description);
    }
  } catch (err) {
    console.error("sendAnimationOrEdit error:", err);
  }
  return await sendOrEdit(chatId, caption, replyMarkup);
}


async function sendChatAction(chatId: number | string, action = "typing") {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  } catch (err) {
    console.error("sendChatAction error:", err);
  }
}

async function answerCallbackQuery(cqId: string, text?: string, showAlert = false) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cqId, text, show_alert: showAlert })
    });
  } catch (err) {
    console.error("answerCallbackQuery error:", err);
  }
}

async function getSession(chatId: string | number) {
  try {
    const { data } = await supabase.from("telegram_bot_sessions").select("state").eq("chat_id", String(chatId)).single();
    return data?.state || null;
  } catch {
    return null;
  }
}

async function setSession(chatId: string | number, state: any) {
  try {
    await supabase.from("telegram_bot_sessions").upsert({ chat_id: String(chatId), state, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("setSession error:", err);
  }
}

async function clearSession(chatId: string | number) {
  try {
    await supabase.from("telegram_bot_sessions").delete().eq("chat_id", String(chatId));
  } catch (err) {
    console.error("clearSession error:", err);
  }
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💸 Catat Pengeluaran", callback_data: "wizard:expense", style: "danger" },
        { text: "📥 Catat Pemasukan", callback_data: "wizard:income", style: "success" }
      ],
      [
        { text: "🔄 Transfer Antar Rekening", callback_data: "wizard:transfer", style: "primary" }
      ],
      [
        { text: "💳 Saldo Kas", callback_data: "view:saldo" },
        { text: "💎 Net Worth", callback_data: "view:networth", style: "primary" }
      ],
      [
        { text: "📊 Hari Ini", callback_data: "view:today" },
        { text: "📑 Bulan Ini", callback_data: "view:month" }
      ],
      [
        { text: "🪙 Emas Treasury", callback_data: "view:gold" },
        { text: "📈 Reksadana Bibit", callback_data: "view:bibit" }
      ],
      [
        { text: "📋 5 Transaksi Terakhir", callback_data: "view:recent" },
        { text: "🌐 Web FinTrack", url: "https://arazy.my.id/finance/", style: "primary" }
      ]
    ]
  };
}

function walletKeyboard(type: string, wallets: any[]) {
  const buttons: any[] = [];
  wallets.forEach((w: any) => {
    let icon = "💳";
    const lower = (w.name || "").toLowerCase();
    if (lower.includes("dana")) icon = "📱";
    else if (lower.includes("sea")) icon = "🏦";
    else if (lower.includes("bca")) icon = "🏛️";
    else if (lower.includes("cash") || lower.includes("tunai") || lower.includes("dompet")) icon = "💵";
    buttons.push([{ text: `${icon} ${w.name} · ${formatIDR(w.balance)}`, callback_data: `pick_wallet:${type}:${w.id}` }]);
  });
  buttons.push([{ text: "✕ Batalkan", callback_data: "cancel_wizard", style: "danger" }]);
  return { inline_keyboard: buttons };
}

function transferWalletKeyboard(step: "from" | "to", wallets: any[], excludeId?: string) {
  const buttons: any[] = [];
  wallets
    .filter((w: any) => !excludeId || w.id !== excludeId)
    .forEach((w: any) => {
      let icon = "💳";
      const lower = (w.name || "").toLowerCase();
      if (lower.includes("dana")) icon = "📱";
      else if (lower.includes("sea")) icon = "🏦";
      else if (lower.includes("bca")) icon = "🏛️";
      else if (lower.includes("cash") || lower.includes("tunai") || lower.includes("dompet")) icon = "💵";
      buttons.push([
        {
          text: `${step === "from" ? "📤" : "📥"} ${icon} ${w.name} · ${formatIDR(w.balance)}`,
          callback_data: `pick_transfer_${step}:${w.id}`
        }
      ]);
    });
  buttons.push([{ text: "✕ Batalkan", callback_data: "cancel_wizard", style: "danger" }]);
  return { inline_keyboard: buttons };
}

let cachedUsdRate: { rate: number; timestamp: number } | null = null;
async function getLiveUsdRate(): Promise<number> {
  const now = Date.now();
  if (cachedUsdRate && (now - cachedUsdRate.timestamp < 60000)) {
    return cachedUsdRate.rate;
  }
  // 1. Primary: Realtime Interbank Forex (matches Google Finance)
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(4000)
    });
    const json = await res.json();
    const rate = json?.rates?.IDR;
    if (rate && rate > 5000) {
      cachedUsdRate = { rate: Math.round(rate * 100) / 100, timestamp: now };
      return cachedUsdRate.rate;
    }
  } catch (e) {
    console.warn("Failed fetching Open ER USD:", e);
  }

  // 2. Secondary fallback: ExchangeRate-API
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: AbortSignal.timeout(4000)
    });
    const json = await res.json();
    const rate = json?.rates?.IDR;
    if (rate && rate > 5000) {
      cachedUsdRate = { rate: Math.round(rate * 100) / 100, timestamp: now };
      return cachedUsdRate.rate;
    }
  } catch (e) {}

  // 3. Fallback: Yahoo Finance USDIDR=X
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/USDIDR=X", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(4000)
    });
    const json = await res.json();
    const rate = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (rate && rate > 5000) {
      cachedUsdRate = { rate: Math.round(rate * 100) / 100, timestamp: now };
      return cachedUsdRate.rate;
    }
  } catch (e) {
    console.warn("Failed fetching live Yahoo USD:", e);
  }
  return cachedUsdRate ? cachedUsdRate.rate : 17887.64;
}

function parseAmountAndNote(rawText: string, usdRate = 17887) {
  const text = rawText.trim();
  const usdRegex = /(?:\$|usd\s*|\bdollar\s*)([0-9]+(?:[.,][0-9]+)?)|([0-9]+(?:[.,][0-9]+)?)\s*(?:\$|usd\b|\bdollar\b)/i;
  const jtRegex = /(?:rp\.?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(?:jt|juta)\b/i;
  const rbRegex = /(?:rp\.?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(?:k|rb|ribu)\b/i;
  const plainRegex = /(?:rp\.?\s*)?([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i;

  let amount = 0;
  let matchStr = "";
  let isDollar = false;
  let dollarVal = 0;

  const usdMatch = text.match(usdRegex);
  const jtMatch = text.match(jtRegex);
  const rbMatch = text.match(rbRegex);
  const plainMatch = text.match(plainRegex);

  if (usdMatch) {
    const rawVal = (usdMatch[1] || usdMatch[2] || "").replace(",", ".");
    dollarVal = parseFloat(rawVal) || 0;
    amount = Math.round(dollarVal * usdRate);
    matchStr = usdMatch[0];
    isDollar = true;
  } else if (jtMatch) {
    amount = parseFloat(jtMatch[1].replace(",", ".")) * 1000000;
    matchStr = jtMatch[0];
  } else if (rbMatch) {
    amount = parseFloat(rbMatch[1].replace(",", ".")) * 1000;
    matchStr = rbMatch[0];
  } else if (plainMatch) {
    const cleanNum = plainMatch[1].replace(/[.,]/g, "");
    amount = parseFloat(cleanNum);
    matchStr = plainMatch[0];
  }

  let note = text.replace(matchStr, "").trim();
  note = note.replace(/(?:di\s+)?(?:dana|seabank|bca|sea)/gi, "").trim();
  note = note.replace(/^(?:untuk|buat|beli|bayar)\s+/i, "").trim();
  note = note.replace(/\s+/g, " ").trim();

  if (isDollar && dollarVal > 0) {
    note = `${note ? note + " " : ""}($${dollarVal} @ Rp ${Math.round(usdRate).toLocaleString("id-ID")})`.trim();
  }

  return { amount, note };
}

function detectCategory(note: string, type: string) {
  const lower = note.toLowerCase();
  if (type === "income") {
    if (lower.includes("gaji") || lower.includes("salary")) return "Gaji & Pendapatan";
    if (lower.includes("bonus") || lower.includes("thr") || lower.includes("hadiah")) return "Bonus & Hadiah";
    if (lower.includes("dividen") || lower.includes("profit") || lower.includes("bunga")) return "Investasi & Dividen";
    return "Pendapatan Lain";
  }
  if (lower.includes("kopi") || lower.includes("makan") || lower.includes("resto") || lower.includes("food") || lower.includes("bakso") || lower.includes("sate") || lower.includes("nasi") || lower.includes("snack") || lower.includes("cafe") || lower.includes("kafe")) return "Makanan & Minuman";
  if (lower.includes("bensin") || lower.includes("pertamax") || lower.includes("pertalite") || lower.includes("parkir") || lower.includes("gojek") || lower.includes("grab") || lower.includes("maxim") || lower.includes("tol") || lower.includes("kereta")) return "Transportasi";
  if (lower.includes("listrik") || lower.includes("pln") || lower.includes("wifi") || lower.includes("indihome") || lower.includes("pulsa") || lower.includes("kuota") || lower.includes("air") || lower.includes("pdam")) return "Tagihan & Utilitas";
  if (lower.includes("belanja") || lower.includes("indomaret") || lower.includes("alfamart") || lower.includes("supermarket") || lower.includes("pasar")) return "Belanja Harian";
  if (lower.includes("game") || lower.includes("steam") || lower.includes("nonton") || lower.includes("bioskop") || lower.includes("netflix") || lower.includes("spotify")) return "Hiburan";
  return "Lain-lain";
}

function getView(viewType: string, appState: any) {
  const wallets = appState?.wallets || [];
  const investments = appState?.investments || {};
  const bibitAssets = appState?.bibit_assets || [];
  const transactions = appState?.transactions || [];

  const cashVal = wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0);
  const goldVal = (Number(investments.treasury?.grams) || 0) * (Number(investments.treasury?.sellPrice) || 2368901);
  const bibitVal = bibitAssets.reduce((s: number, a: any) => s + ((Number(a.units) || 0) * (Number(a.currentNav) || 0)), 0);
  const netWorth = cashVal + goldVal + bibitVal;

  if (viewType === "saldo") {
    let lines = "";
    for (const w of wallets) {
      let icon = "💳";
      const l = (w.name || "").toLowerCase();
      if (l.includes("dana")) icon = "📱";
      else if (l.includes("sea")) icon = "🏦";
      else if (l.includes("bca")) icon = "🏛️";
      else if (l.includes("cash") || l.includes("tunai") || l.includes("dompet")) icon = "💵";
      const pct = cashVal > 0 ? ((Number(w.balance) || 0) / cashVal) * 100 : 0;
      lines += `${icon} <b>${escapeHtml(w.name)}</b>\n├ Saldo: <code>${formatIDR(w.balance)}</code>\n└ Porsi: ${makeProgressBar(pct, 7)} <i>${pct.toFixed(1)}%</i>\n\n`;
    }
    const text = `🏦 <b>DOMPET &amp; KAS LIKUID</b>\n<blockquote>\n💳 <b>TOTAL KAS TERSEDIA:</b>\n<code>${formatIDR(cashVal)}</code>\n</blockquote>\n\n<blockquote>\n<b>RINCIAN REKENING:</b>\n\n${lines.trim()}\n</blockquote>\n🕒 <i>Diperbarui · ${formatWIB(new Date())}</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "💸 Catat Keluar", callback_data: "wizard:expense", style: "danger" }, { text: "📥 Catat Masuk", callback_data: "wizard:income", style: "success" }],
        [{ text: "🔄 Transfer Antar Rekening", callback_data: "wizard:transfer", style: "primary" }],
        [{ text: "💎 Cek Net Worth", callback_data: "view:networth", style: "primary" }, { text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };
  }

  if (viewType === "networth") {
    const cashPct = netWorth > 0 ? (cashVal / netWorth) * 100 : 0;
    const goldPct = netWorth > 0 ? (goldVal / netWorth) * 100 : 0;
    const bibitPct = netWorth > 0 ? (bibitVal / netWorth) * 100 : 0;

    const text = `👑 <b>TOTAL KEKAYAAN BERSIH (NET WORTH)</b>\n<blockquote>\n💎 <b>EXECUTIVE VALUATION:</b>\n<code>${formatIDR(netWorth)}</code>\n</blockquote>\n\n<blockquote>\n<b>STRUKTUR PORTOFOLIO:</b>\n\n🪙 <b>Emas Treasury (${goldPct.toFixed(1)}%)</b>\n${makeProgressBar(goldPct, 8)} <code>${formatIDR(goldVal)}</code>\n└ ${(Number(investments.treasury?.grams) || 0).toFixed(4)} gr emas fisik live\n\n📈 <b>Reksadana Bibit (${bibitPct.toFixed(1)}%)</b>\n${makeProgressBar(bibitPct, 8)} <code>${formatIDR(bibitVal)}</code>\n└ ${bibitAssets.length} produk portofolio aktif\n\n🏦 <b>Kas Likuid (${cashPct.toFixed(1)}%)</b>\n${makeProgressBar(cashPct, 8)} <code>${formatIDR(cashVal)}</code>\n└ ${wallets.length} akun bank &amp; e-wallet\n</blockquote>\n🕒 <i>${formatWIB(new Date())}</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "🪙 Detail Emas", callback_data: "view:gold" }, { text: "📈 Detail Bibit", callback_data: "view:bibit" }],
        [{ text: "💳 Cek Saldo Kas", callback_data: "view:saldo" }, { text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };
  }

  if (viewType === "today" || viewType === "laporan") {
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayInc = 0, todayExp = 0, todayItems = "", count = 0;
    for (const t of transactions) {
      if (t.date && t.date.slice(0, 10) === todayStr) {
        count++;
        if (t.type === "income") {
          todayInc += Number(t.amount) || 0;
          todayItems += `• 🟢 +<code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note || t.category)}</b>\n  └ 💳 <i>${escapeHtml(t.walletName || "Kas")}</i>\n`;
        } else if (t.type === "expense") {
          todayExp += Number(t.amount) || 0;
          todayItems += `• 🔴 -<code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note || t.category)}</b>\n  └ 💳 <i>${escapeHtml(t.walletName || "Kas")}</i>\n`;
        } else if (t.type === "transfer") {
          todayItems += `• 🔄 ⇄<code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note || "Transfer")}</b>\n  └ 💳 <i>${escapeHtml(t.walletName || "Transfer")}</i>\n`;
        }
      }
    }
    const flow = todayInc - todayExp;
    const text = `📊 <b>LAPORAN ARUS KAS HARI INI</b>\n<blockquote>\n⚖️ <b>NET CASH FLOW:</b>\n<code>${flow >= 0 ? "+" : ""}${formatIDR(flow)}</code>\n\n🟢 <b>Pemasukan:</b> <code>${formatIDR(todayInc)}</code>\n🔴 <b>Pengeluaran:</b> <code>${formatIDR(todayExp)}</code>\n🔢 <b>Total Mutasi:</b> ${count} transaksi\n</blockquote>\n\n<blockquote>\n<b>RINCIAN TRANSAKSI:</b>\n${todayItems || "<i>Belum ada mutasi tercatat hari ini.</i>\n"}</blockquote>\n🕒 <i>${formatWIB(new Date())}</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "💸 Catat Keluar", callback_data: "wizard:expense", style: "danger" }, { text: "📥 Catat Masuk", callback_data: "wizard:income", style: "success" }],
        [{ text: "🔄 Transfer Saldo", callback_data: "wizard:transfer", style: "primary" }],
        [{ text: "📑 Rekap Bulanan", callback_data: "view:month" }, { text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };
  }

  if (viewType === "month") {
    const monthStr = new Date().toISOString().slice(0, 7);
    let mInc = 0, mExp = 0, count = 0;
    for (const t of transactions) {
      if (t.date && t.date.slice(0, 7) === monthStr) {
        count++;
        if (t.type === "income") mInc += Number(t.amount) || 0;
        else if (t.type === "expense") mExp += Number(t.amount) || 0;
      }
    }
    const flow = mInc - mExp;
    const text = `📑 <b>REKAP KEUANGAN BULAN INI (${monthStr})</b>\n<blockquote>\n⚖️ <b>NET CASH FLOW BULANAN:</b>\n<code>${flow >= 0 ? "+" : ""}${formatIDR(flow)}</code>\n\n🟢 <b>Total Pemasukan:</b> <code>${formatIDR(mInc)}</code>\n🔴 <b>Total Pengeluaran:</b> <code>${formatIDR(mExp)}</code>\n🔢 <b>Volume Transaksi:</b> ${count} mutasi\n</blockquote>\n\n<blockquote>\n👑 <b>Net Worth Terkini:</b>\n<code>${formatIDR(netWorth)}</code>\n</blockquote>\n🕒 <i>${formatWIB(new Date())}</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "📊 Laporan Hari Ini", callback_data: "view:today" }, { text: "📋 5 Riwayat Terakhir", callback_data: "view:recent" }],
        [{ text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };
  }

  if (viewType === "gold" || viewType === "emas") {
    const t = investments.treasury || {};
    const grams = Number(t.grams) || 0;
    const sellPrice = Number(t.sellPrice) || 2368901;
    const val = grams * sellPrice;
    const cost = Number(t.totalCost) || 0;
    const profit = val - cost;
    const pct = cost > 0 ? (profit / cost) * 100 : 0;
    const text = `🪙 <b>PORTOFOLIO EMAS TREASURY</b>\n<blockquote>\n🥇 <b>NILAI PASAR (VALUASI):</b>\n<code>${formatIDR(val)}</code>\n</blockquote>\n\n<blockquote>\n<b>RINCIAN INVESTASI:</b>\n⚖️ <b>Berat Simpanan:</b> <code>${grams.toFixed(4)} gram</code>\n📈 <b>Harga Buyback:</b> <code>${formatIDR(sellPrice)} / gram</code>\n💼 <b>Modal Pembelian:</b> <code>${formatIDR(cost)}</code>\n💹 <b>Floating P&amp;L:</b> ${pct >= 0 ? "🟢 +" : "🔴 "}${pct.toFixed(2)}% (<code>${pct >= 0 ? "+" : ""}${formatIDR(profit)}</code>)\n</blockquote>\n🕒 <i>Live updated dari Treasury API</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "💎 Cek Net Worth", callback_data: "view:networth", style: "primary" }, { text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };
  }

  if (viewType === "bibit") {
    let lines = "", totalBibit = 0;
    for (const a of bibitAssets) {
      const val = (Number(a.units) || 0) * (Number(a.currentNav) || 0);
      totalBibit += val;
      lines += `📈 <b>${escapeHtml(a.name)}</b>\n├ Unit: <code>${Number(a.units || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 })} UP</code>\n├ NAV: <code>${formatIDR(a.currentNav)}</code>\n└ Nilai: <code>${formatIDR(val)}</code>\n\n`;
    }
    const text = `📈 <b>PORTOFOLIO REKSADANA BIBIT</b>\n<blockquote>\n💎 <b>TOTAL NILAI PORTOFOLIO:</b>\n<code>${formatIDR(totalBibit)}</code>\n</blockquote>\n\n<blockquote>\n<b>ALOKASI PRODUK:</b>\n\n${lines.trim()}\n</blockquote>\n🕒 <i>Auto-sync aktif setiap 1 jam</i>`;
    const kb = {
      inline_keyboard: [
        [{ text: "🔄 Sinkronkan Data Sekarang", callback_data: "action:sync_bibit", style: "primary" }],
        [{ text: "💎 Cek Net Worth", callback_data: "view:networth", style: "primary" }, { text: "🏠 Menu Utama", callback_data: "view:menu" }]
      ]
    };
    return { text, kb };

  }

  if (viewType === "recent") {
    const recent = transactions.slice(0, 5);
    let lines = "";
    const deleteButtons: any[] = [];
    if (recent.length === 0) {
      lines = "<i>Belum ada transaksi yang tercatat.</i>\n";
    } else {
      recent.forEach((t: any, idx: number) => {
        const sign = t.type === "income" ? "🟢 +" : (t.type === "transfer" ? "🔄 ⇄ " : "🔴 -");
        lines += `<b>${idx + 1}.</b> ${sign}<code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note || t.category)}</b>\n   └ 💳 <i>${escapeHtml(t.walletName || "Kas")} · ${formatWIB(t.date || new Date())}</i>\n\n`;
        deleteButtons.push([{ text: `🗑️ Batalkan #${idx + 1} (${formatIDR(t.amount)})`, callback_data: `del_tx:${t.id}`, style: "danger" }]);
      });
    }
    deleteButtons.push([{ text: "🏠 Menu Utama", callback_data: "view:menu", style: "primary" }]);
    const text = `📋 <b>5 TRANSAKSI TERAKHIR</b>\n<blockquote>\n${lines.trim()}\n</blockquote>\n<i>Klik tombol di bawah jika ingin membatalkan/menghapus transaksi:</i>`;
    return { text, kb: { inline_keyboard: deleteButtons } };
  }

  // Fallback: Menu Utama
  const menuText = `✨ <b>FINTRACK PRIVÉ</b> · <i>Executive Financial Suite</i>\n<blockquote>\n👑 <b>TOTAL WEALTH &amp; NET WORTH:</b>\n<code>${formatIDR(netWorth)}</code>\n${makeProgressBar(100, 8)} 100%\n\n💼 <b>Kas Likuid:</b> <code>${formatIDR(cashVal)}</code>\n🪙 <b>Emas &amp; Reksadana:</b> <code>${formatIDR(goldVal + bibitVal)}</code>\n</blockquote>\n\n<blockquote>\n💡 <b>Smart AI Quick Input:</b>\nKetik langsung di chat ini, contoh:\n• <code>kopi 35k bca</code>\n• <code>makan 45k, bensin 30k sea</code>\n• <code>tf 100k bca ke dana</code>\n</blockquote>`;
  return { text: menuText, kb: mainMenuKeyboard() };
}

async function recordTransaction(type: string, walletId: string, walletName: string, amount: number, note: string, appState: any, chatId: number | string, userMsgId?: number) {
  let wallets = appState?.wallets || [];
  const investments = appState?.investments || {};
  const bibitAssets = appState?.bibit_assets || [];
  let transactions = appState?.transactions || [];

  const category = detectCategory(note, type);
  const newTx = {
    id: "tx-" + Date.now(),
    type,
    walletId,
    walletName,
    amount,
    category,
    note,
    date: new Date().toISOString()
  };

  let remainingBal = 0;
  wallets = wallets.map((w: any) => {
    if (w.id === walletId) {
      const curBal = Number(w.balance) || 0;
      const newBal = type === "income" ? curBal + amount : curBal - amount;
      remainingBal = newBal;
      return { ...w, balance: newBal };
    }
    return w;
  });

  transactions = [newTx, ...transactions];

  await supabase.from("fintrack_app_state").upsert({
    id: "default_user",
    wallets,
    investments,
    bibit_assets: bibitAssets,
    transactions,
    updated_at: new Date().toISOString()
  });

  await clearSession(chatId);

  const newCash = wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0);
  const goldVal = (Number(investments.treasury?.grams) || 0) * (Number(investments.treasury?.sellPrice) || 2368901);
  const bibitVal = bibitAssets.reduce((s: number, a: any) => s + ((Number(a.units) || 0) * (Number(a.currentNav) || 0)), 0);
  const newNetWorth = newCash + goldVal + bibitVal;

  const isInc = type === "income";

  sendDiscordNotification({
    title: isInc ? "💰 Pemasukan Baru (Telegram)" : "💸 Pengeluaran Baru (Telegram)",
    description: `**${formatIDR(amount)}** dicatat ke dompet **${walletName}**`,
    color: isInc ? 0x2ecc71 : 0xe74c3c,
    fields: [
      { name: "Kategori", value: category, inline: true },
      { name: "Catatan", value: note, inline: true },
      { name: "Sisa Saldo", value: formatIDR(remainingBal), inline: false },
      { name: "Total Kekayaan Bersih", value: formatIDR(newNetWorth), inline: false }
    ]
  }).catch(() => {});

  const successReceipt = `✨ <b>STRUK TRANSAKSI TERCATAT</b>\n<blockquote>\n${isInc ? "🟢 <b>PEMASUKAN</b>" : "🔴 <b>PENGELUARAN</b>"}\n<code>${formatIDR(amount)}</code>\n\n📝 <b>Keperluan:</b> ${escapeHtml(note)}\n📂 <b>Kategori:</b> ${escapeHtml(category)}\n💳 <b>Rekening:</b> ${escapeHtml(walletName)}\n🕒 <i>${formatWIB(new Date())}</i>\n</blockquote>\n\n<blockquote>\n💼 <b>POSISI KEUANGAN SAAT INI:</b>\n💳 <b>Sisa ${escapeHtml(walletName)}:</b> <code>${formatIDR(remainingBal)}</code>\n💎 <b>Net Worth:</b> <code>${formatIDR(newNetWorth)}</code>\n</blockquote>\n<i>Perubahan telah disinkronkan ke Web FinTrack realtime.</i>`;

  const receiptKb = {
    inline_keyboard: [
      [{ text: "🗑️ Batalkan Transaksi Ini", callback_data: `del_tx:${newTx.id}`, style: "danger" }],
      [{ text: "🏠 Menu Utama", callback_data: "view:menu", style: "primary" }, { text: "📋 Riwayat", callback_data: "view:recent" }]
    ]
  };

  if (userMsgId) setReaction(chatId, userMsgId, "🎉");
  await sendAnimationOrEdit(chatId, CHECKMARK_GIF, successReceipt, receiptKb);
}

async function recordTransfer(
  fromWalletId: string,
  fromWalletName: string,
  toWalletId: string,
  toWalletName: string,
  amount: number,
  note: string,
  appState: any,
  chatId: number | string,
  userMsgId?: number
) {
  let wallets = appState?.wallets || [];
  const investments = appState?.investments || {};
  const bibitAssets = appState?.bibit_assets || [];
  let transactions = appState?.transactions || [];

  const newTx = {
    id: "tx-" + Date.now(),
    type: "transfer",
    fromWalletId,
    toWalletId,
    walletId: fromWalletId,
    walletName: `${fromWalletName} ➔ ${toWalletName}`,
    amount,
    category: "Transfer Saldo",
    note: note || `Transfer ${fromWalletName} ke ${toWalletName}`,
    date: new Date().toISOString()
  };

  let fromBal = 0;
  let toBal = 0;
  wallets = wallets.map((w: any) => {
    if (w.id === fromWalletId) {
      fromBal = (Number(w.balance) || 0) - amount;
      return { ...w, balance: fromBal };
    }
    if (w.id === toWalletId) {
      toBal = (Number(w.balance) || 0) + amount;
      return { ...w, balance: toBal };
    }
    return w;
  });

  transactions = [newTx, ...transactions];

  await supabase.from("fintrack_app_state").upsert({
    id: "default_user",
    wallets,
    investments,
    bibit_assets: bibitAssets,
    transactions,
    updated_at: new Date().toISOString()
  });

  await clearSession(chatId);

  const newCash = wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0);
  const goldVal = (Number(investments.treasury?.grams) || 0) * (Number(investments.treasury?.sellPrice) || 2368901);
  const bibitVal = bibitAssets.reduce((s: number, a: any) => s + ((Number(a.units) || 0) * (Number(a.currentNav) || 0)), 0);
  const newNetWorth = newCash + goldVal + bibitVal;

  sendDiscordNotification({
    title: "🔄 Mutasi Antar Rekening (Telegram)",
    description: `Transfer **${formatIDR(amount)}** dari **${fromWalletName}** ke **${toWalletName}**`,
    color: 0x3b82f6,
    fields: [
      { name: "Dari", value: `${fromWalletName} (Sisa: ${formatIDR(fromBal)})`, inline: true },
      { name: "Ke", value: `${toWalletName} (Menjadi: ${formatIDR(toBal)})`, inline: true },
      { name: "Catatan", value: newTx.note || "-", inline: false },
      { name: "Total Kekayaan Bersih", value: formatIDR(newNetWorth), inline: false }
    ]
  }).catch(() => {});

  const successReceipt = `✨ <b>TRANSFER SALDO BERHASIL</b>\n<blockquote>\n🔄 <b>MUTASI ANTAR REKENING</b>\n<code>${formatIDR(amount)}</code>\n\n📤 <b>Dari:</b> ${escapeHtml(fromWalletName)} (Sisa: <code>${formatIDR(fromBal)}</code>)\n📥 <b>Ke:</b> ${escapeHtml(toWalletName)} (Menjadi: <code>${formatIDR(toBal)}</code>)\n📝 <b>Catatan:</b> ${escapeHtml(newTx.note)}\n🕒 <i>${formatWIB(new Date())}</i>\n</blockquote>\n\n<blockquote>\n💎 <b>Net Worth:</b> <code>${formatIDR(newNetWorth)}</code>\n</blockquote>\n<i>Perubahan telah disinkronkan ke Web FinTrack realtime.</i>`;

  const receiptKb = {
    inline_keyboard: [
      [{ text: "🗑️ Batalkan Transfer Ini", callback_data: `del_tx:${newTx.id}`, style: "danger" }],
      [{ text: "🏠 Menu Utama", callback_data: "view:menu", style: "primary" }, { text: "📋 Riwayat", callback_data: "view:recent" }]
    ]
  };

  if (userMsgId) setReaction(chatId, userMsgId, "🎉");
  await sendAnimationOrEdit(chatId, CHECKMARK_GIF, successReceipt, receiptKb);
}

async function deleteAndRefund(txId: string, appState: any, chatId: number | string, messageId?: number) {
  let wallets = appState?.wallets || [];
  const investments = appState?.investments || {};
  const bibitAssets = appState?.bibit_assets || [];
  let transactions = appState?.transactions || [];

  const txIndex = transactions.findIndex((t: any) => t.id === txId);
  if (txIndex < 0) {
    await sendOrEdit(chatId, "⚠️ <i>Transaksi tidak ditemukan atau sudah dibatalkan.</i>", mainMenuKeyboard(), messageId);
    return;
  }

  const targetTx = transactions[txIndex];
  const txAmount = Number(targetTx.amount) || 0;
  const isExp = targetTx.type === "expense";
  const isInc = targetTx.type === "income";
  const isTf = targetTx.type === "transfer";

  let revertedWalletBal = 0;
  if (isTf) {
    wallets = wallets.map((w: any) => {
      if (w.id === targetTx.fromWalletId) {
        const newBal = (Number(w.balance) || 0) + txAmount;
        revertedWalletBal = newBal;
        return { ...w, balance: newBal };
      }
      if (w.id === targetTx.toWalletId) {
        return { ...w, balance: (Number(w.balance) || 0) - txAmount };
      }
      return w;
    });
  } else {
    wallets = wallets.map((w: any) => {
      if (w.id === targetTx.walletId) {
        const curBal = Number(w.balance) || 0;
        const newBal = isExp ? curBal + txAmount : (isInc ? curBal - txAmount : curBal);
        revertedWalletBal = newBal;
        return { ...w, balance: newBal };
      }
      return w;
    });
  }

  transactions.splice(txIndex, 1);

  await supabase.from("fintrack_app_state").upsert({
    id: "default_user",
    wallets,
    investments,
    bibit_assets: bibitAssets,
    transactions,
    updated_at: new Date().toISOString()
  });

  const refundDetail = isTf
    ? `🔄 <b>Transfer:</b> ${escapeHtml(targetTx.note || "Transfer Saldo")} (<code>${formatIDR(txAmount)}</code>)\n└ <i>Dana telah dikembalikan ke ${escapeHtml(targetTx.walletName?.split("➔")[0]?.trim() || "pengirim")}</i>`
    : `📝 <b>Transaksi:</b> ${escapeHtml(targetTx.note || targetTx.category)} (<code>${formatIDR(txAmount)}</code>)\n├ 💳 <b>Rekening:</b> ${escapeHtml(targetTx.walletName || "Dompet")}\n└ 💰 <b>Saldo Terkini:</b> <code>${formatIDR(revertedWalletBal)}</code>`;

  const refundText = `🗑️ <b>TRANSAKSI TELAH DIBATALKAN &amp; DIREVERT</b>\n<blockquote>\n${refundDetail}\n</blockquote>\n<i>Perubahan telah disinkronkan ke Web FinTrack realtime.</i>`;
  const backKb = {
    inline_keyboard: [
      [{ text: "🏠 Kembali ke Menu Utama", callback_data: "view:menu" }],
      [{ text: "📋 Lihat Riwayat Terbaru", callback_data: "view:recent" }]
    ]
  };

  await sendOrEdit(chatId, refundText, backKb, messageId);
}


async function executePendingTransactions(
  pendingList: any[],
  appState: any,
  chatId: number | string,
  messageId?: number
) {
  let wallets = appState?.wallets || [];
  const investments = appState?.investments || {};
  const bibitAssets = appState?.bibit_assets || [];
  let transactions = appState?.transactions || [];

  const createdTxs: any[] = [];

  for (const item of pendingList) {
    const amount = Number(item.amount) || 0;
    if (amount <= 0) continue;

    if (item.type === "transfer") {
      const fromWallet = wallets.find((w: any) =>
        (w.name || "").toLowerCase().includes((item.fromWalletName || "").toLowerCase())
      ) || wallets[0];

      const toWallet = wallets.find((w: any) =>
        (w.name || "").toLowerCase().includes((item.toWalletName || "").toLowerCase())
      ) || wallets[1] || wallets[0];

      const tx = {
        id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        type: "transfer",
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        walletId: fromWallet.id,
        walletName: `${fromWallet.name} ➔ ${toWallet.name}`,
        amount,
        category: "Transfer Antar Rekening",
        note: item.note || `Transfer ${fromWallet.name} ke ${toWallet.name}`,
        date: new Date().toISOString()
      };

      wallets = wallets.map((w: any) => {
        if (w.id === fromWallet.id) return { ...w, balance: (Number(w.balance) || 0) - amount };
        if (w.id === toWallet.id) return { ...w, balance: (Number(w.balance) || 0) + amount };
        return w;
      });

      transactions = [tx, ...transactions];
      createdTxs.push(tx);
    } else {
      const wallet = wallets.find((w: any) =>
        (w.name || "").toLowerCase().includes((item.walletName || "").toLowerCase())
      ) || wallets[0];

      const isInc = item.type === "income";
      const tx = {
        id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        type: item.type || "expense",
        walletId: wallet.id,
        walletName: wallet.name,
        amount,
        category: item.category || (isInc ? "Gaji & Pendapatan" : "Pengeluaran"),
        note: item.note || (isInc ? "Pemasukan" : "Pengeluaran"),
        date: new Date().toISOString()
      };

      wallets = wallets.map((w: any) => {
        if (w.id === wallet.id) {
          const cur = Number(w.balance) || 0;
          return { ...w, balance: isInc ? cur + amount : cur - amount };
        }
        return w;
      });

      transactions = [tx, ...transactions];
      createdTxs.push(tx);
    }
  }

  // Atomically update Supabase
  await supabase.from("fintrack_app_state").upsert({
    id: "default_user",
    wallets,
    investments,
    bibit_assets: bibitAssets,
    transactions,
    updated_at: new Date().toISOString()
  });

  await clearSession(chatId);

  const newCash = wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0);
  const goldVal = (Number(investments.treasury?.grams) || 0) * (Number(investments.treasury?.sellPrice) || 2368901);
  const bibitVal = bibitAssets.reduce((s: number, a: any) => s + ((Number(a.units) || 0) * (Number(a.currentNav) || 0)), 0);
  const newNetWorth = newCash + goldVal + bibitVal;

  sendDiscordNotification({
    title: `🤖 ${createdTxs.length} Transaksi AI Berhasil Dicatat`,
    description: createdTxs.map(t => `${t.type === "income" ? "🟢" : t.type === "transfer" ? "🔄" : "🔴"} **${formatIDR(t.amount)}** · ${t.note || t.category} (${t.walletName})`).join("\n"),
    color: 0x8b5cf6,
    fields: [
      { name: "Total Kas Likuid", value: formatIDR(newCash), inline: true },
      { name: "Total Net Worth", value: formatIDR(newNetWorth), inline: true }
    ]
  }).catch(() => {});

  let reportLines = `✨ <b>${createdTxs.length} TRANSAKSI DIEKSEKUSI</b>\n<blockquote>\n`;
  createdTxs.forEach((t, i) => {
    if (t.type === "transfer") {
      reportLines += `<b>${i + 1}.</b> 🔄 <b>Transfer:</b> <code>${formatIDR(t.amount)}</code>\n   └ <i>${escapeHtml(t.walletName)}</i>\n`;
    } else if (t.type === "income") {
      reportLines += `<b>${i + 1}.</b> 🟢 <b>Masuk:</b> <code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note)}</b>\n   └ 💳 <i>${escapeHtml(t.walletName)}</i>\n`;
    } else {
      reportLines += `<b>${i + 1}.</b> 🔴 <b>Keluar:</b> <code>${formatIDR(t.amount)}</code> · <b>${escapeHtml(t.note)}</b>\n   └ 💳 <i>${escapeHtml(t.walletName)}</i>\n`;
    }
  });
  reportLines += `</blockquote>\n\n<blockquote>\n💎 <b>Net Worth Terkini:</b> <code>${formatIDR(newNetWorth)}</code>\n💼 <b>Total Kas Likuid:</b> <code>${formatIDR(newCash)}</code>\n</blockquote>\n🕒 <i>${formatWIB(new Date())} · Tersinkron ke Web FinTrack</i>`;

  const kb = {
    inline_keyboard: [
      [{ text: "🏠 Menu Utama", callback_data: "view:menu" }],
      [{ text: "📋 5 Transaksi Terakhir", callback_data: "view:recent" }]
    ]
  };

  await sendAnimationOrEdit(chatId, CHECKMARK_GIF, reportLines, kb, messageId);
}

async function parseWithHermesOrFallback(text: string, wallets: any[]) {
  const walletListStr = wallets.map((w: any) => w.name).join(", ") || "SeaBank, ATM BCA, Cash (Dompet Fisik), DANA";
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY wajib diset di file .env!");
  }

  // Live Realtime Forex USD to IDR rate
  const liveUsdRate = await getLiveUsdRate();
  const rateRounded = Math.round(liveUsdRate);
  const rateFormatted = rateRounded.toLocaleString("id-ID");

  // 1. Multi-Model Fallback Chain (Gemini Flash Lite Latest -> Gemini 3.1 Flash Lite -> Gemini 2.5 Flash)
  const candidateModels = [
    { id: "gemini-flash-lite-latest", label: "Gemini Flash Lite" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
  ];

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const promptSystem = `You are an expert financial transaction extractor for Indonesian users.
User wallets: ${walletListStr}.
Today's local date is ${new Date().toISOString().slice(0, 10)}.
Current Live USD Exchange Rate: 1 USD = Rp ${rateFormatted} (IDR ${rateRounded}).

Rules:
1. Parse single or multiple transactions from user's text into a JSON array of objects.
2. For each transaction, extract:
   - "type": "expense" | "income" | "transfer"
   - "amount": integer in Rupiah (IDR).
     * Standard Indonesian expressions: e.g. 25k -> 25000, 50rb -> 50000, 1.5jt -> 1500000, 100000 -> 100000.
     * Foreign Currencies (USD / Dollar / $): If user inputs amounts in USD, Dollar, or $ (e.g. "$10", "15 dollar", "5 usd", "domain $12.50", "beli vps 7.5 dollar"):
       AUTOMATICALLY CONVERT TO RUPIAH by multiplying the dollar value by the live rate (1 USD = ${rateRounded} IDR), rounded to nearest integer (e.g. "$10" -> ${10 * rateRounded}).
       In the "note" field, include the original dollar amount in parentheses, e.g. "Beli Domain ($12 @ Rp ${rateFormatted})".
   - "wallet": matched wallet name from user wallets (or most appropriate default)
   - "fromWallet": for transfers, the source wallet name
   - "toWallet": for transfers, the destination wallet name
   - "category": appropriate category (e.g. "Makanan & Minuman", "Transportasi", "Belanja & Hiburan", "Tagihan & Utilitas", "Kesehatan", "Gaji & Pendapatan", "Investasi", "Transfer Antar Rekening", "Teknologi & Langganan")
   - "note": clean, concise description
3. Return ONLY a valid JSON array of objects: [{"type":..., "amount":..., "wallet":..., "fromWallet":..., "toWallet":..., "category":..., "note":...}]. No markdown wrapping or explanations.`;

      const payload = {
        model: model.id,
        messages: [
          { role: "system", content: promptSystem },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 500
      };

      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        const cleanJson = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        const parsedArray = JSON.parse(cleanJson);

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          return {
            engine: "gemini",
            engineName: `${model.label} (Online)`,
            status: "online",
            transactions: parsedArray.map((item: any) => ({
              type: item.type || "expense",
              amount: Math.round(Number(item.amount)) || 0,
              category: item.category || (item.type === "transfer" ? "Transfer Antar Rekening" : "Lain-lain"),
              note: item.note || (item.type === "transfer" ? `Transfer ke ${item.toWallet || ""}` : "Pengeluaran"),
              walletName: item.wallet || item.fromWallet || wallets[0]?.name || "Dompet",
              fromWalletName: item.fromWallet || "",
              toWalletName: item.toWallet || ""
            }))
          };
        }
      } else {
        console.warn(`[Bot AI] Model ${model.id} HTTP ${res.status}, trying fallback...`);
      }
    } catch (err: any) {
      console.warn(`[Bot AI] Model ${model.id} failed:`, err.message);
    }
  }

  // 2. Fallback Heuristik Lokal
  const { amount, note: rawNote } = parseAmountAndNote(text, rateRounded);
  const lower = text.toLowerCase();
  let targetWallet = wallets[0];
  if (lower.includes("dana")) targetWallet = wallets.find((w: any) => (w.name || "").toLowerCase().includes("dana")) || targetWallet;
  else if (lower.includes("sea")) targetWallet = wallets.find((w: any) => (w.name || "").toLowerCase().includes("sea")) || targetWallet;
  else if (lower.includes("bca")) targetWallet = wallets.find((w: any) => (w.name || "").toLowerCase().includes("bca")) || targetWallet;

  let txType = "expense";
  if (lower.includes("gaji") || lower.includes("masuk") || lower.includes("terima") || lower.includes("bonus") || lower.includes("income")) {
    txType = "income";
  }

  let note = rawNote;
  if (!note || note.length < 2) note = txType === "income" ? "Pemasukan Tambahan" : "Pengeluaran";
  note = note.charAt(0).toUpperCase() + note.slice(1);

  return {
    engine: "fallback",
    engineName: "Fallback Heuristik Lokal",
    status: "offline",
    transactions: [
      {
        type: txType,
        amount: Math.round(amount) || 0,
        category: txType === "income" ? "Gaji & Pendapatan" : "Pengeluaran",
        note,
        walletName: targetWallet?.name || "Dompet"
      }
    ]
  };
}

function renderConfirmationCard(parseResult: any, wallets: any[]) {
  const { engineName, status, transactions } = parseResult;
  const statusBadge = status === "online" ? `⚡ <code>${escapeHtml(engineName)}</code>` : `🛡️ <code>${escapeHtml(engineName)}</code>`;

  let totalExpense = 0;
  let totalIncome = 0;
  let totalTransfer = 0;

  let itemsText = "";

  transactions.forEach((tx: any, idx: number) => {
    if (tx.type === "transfer") {
      totalTransfer += tx.amount;
      itemsText += `<b>${idx + 1}.</b> 🔄 <b>${formatIDR(tx.amount)}</b> · <b>Transfer</b>\n   ├ 📤 <i>${escapeHtml(tx.fromWalletName || "Pengirim")}</i>\n   └ 📥 <i>${escapeHtml(tx.toWalletName || "Penerima")}</i>\n\n`;
    } else if (tx.type === "income") {
      totalIncome += tx.amount;
      itemsText += `<b>${idx + 1}.</b> 🟢 <b>${formatIDR(tx.amount)}</b> · <b>${escapeHtml(tx.note)}</b>\n   ├ 💳 <i>${escapeHtml(tx.walletName || "Dompet")}</i>\n   └ 🏷️ <i>${escapeHtml(tx.category || "Pemasukan")}</i>\n\n`;
    } else {
      totalExpense += tx.amount;
      itemsText += `<b>${idx + 1}.</b> 🔴 <b>${formatIDR(tx.amount)}</b> · <b>${escapeHtml(tx.note)}</b>\n   ├ 💳 <i>${escapeHtml(tx.walletName || "Dompet")}</i>\n   └ 🏷️ <i>${escapeHtml(tx.category || "Pengeluaran")}</i>\n\n`;
    }
  });

  let totalsText = "";
  if (totalTransfer > 0) totalsText += `├ 🔄 <b>Total Transfer:</b> <code>${formatIDR(totalTransfer)}</code>\n`;
  if (totalIncome > 0) totalsText += `├ 🟢 <b>Total Pemasukan:</b> <code>${formatIDR(totalIncome)}</code>\n`;
  if (totalExpense > 0) totalsText += `├ 🔴 <b>Total Pengeluaran:</b> <code>${formatIDR(totalExpense)}</code>\n`;
  totalsText += `└ ⚡ <b>Engine:</b> ${statusBadge}`;

  const text = `✦ <b>FINTRACK AI SCANNER</b>\n<blockquote>\n📋 <b>Review Mutasi (${transactions.length} item)</b>\n\n${itemsText.trim()}\n</blockquote>\n\n<blockquote>\n📊 <b>RINGKASAN ARUS KAS:</b>\n${totalsText}\n</blockquote>\n<i>Klik <b>Eksekusi Sekarang</b> untuk mencatat sekaligus, atau <b>Batalkan</b>:</i>`;

  const kb = {
    inline_keyboard: [
      [
        { text: `⚡ Eksekusi Sekarang (${transactions.length})`, callback_data: "exec_pending_multi_tx", style: "success" },
        { text: "✕ Batalkan", callback_data: "cancel_pending_multi_tx", style: "danger" }
      ]
    ]
  };

  return { text, kb };
}

async function handleUpdate(update: any): Promise<Response> {
  try {
    // 🛡️ SECURITY GUARD: Whitelist Telegram User ID (Strict dari .env)
    const ALLOWED_USER_ID = Deno.env.get("ALLOWED_TELEGRAM_USER_ID")?.trim();
    const sender = update.message?.from || update.callback_query?.from;
    const senderId = sender?.id ? String(sender.id) : null;

    if (!ALLOWED_USER_ID) {
      console.error("[Security Error] ALLOWED_TELEGRAM_USER_ID belum dikonfigurasi di .env!");
      return new Response("Bot owner ID not configured", { status: 500 });
    }

    if (senderId && senderId !== ALLOWED_USER_ID) {
      console.warn(`[Security Alert] Akses tidak sah dari Telegram ID: ${senderId} (@${sender?.username || "unknown"})`);
      if (update.callback_query) {
        await answerCallbackQuery(update.callback_query.id, "⛔ Akses ditolak! Bot FinTrack ini bersifat pribadi.", true);
      } else if (update.message?.chat?.id) {
        await sendOrEdit(
          update.message.chat.id,
          "⛔ <b>Akses Ditolak!</b>\n\nBot FinTrack ini bersifat pribadi dan hanya dapat diakses oleh pemilik akun."
        );
      }
      return new Response("Unauthorized", { status: 403 });
    }

    const { data: appState } = await supabase.from("fintrack_app_state").select("*").eq("id", "default_user").single();
    const wallets = appState?.wallets || [];

    // A. CALLBACK QUERIES
    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackId = cq.id;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;
      const data = cq.data || "";

      // 1. Regular Income / Expense Wizard
      if (data.startsWith("wizard:")) {
        const type = data.split(":")[1];
        await answerCallbackQuery(callbackId);

        if (type === "transfer") {
          const promptText = `🔄 <b>TRANSFER ANTAR REKENING</b>\n<blockquote>\n<b>Langkah 1/3:</b>\nPilih <b>Rekening Asal (Pengirim)</b> di bawah:\n</blockquote>`;
          await sendOrEdit(chatId, promptText, transferWalletKeyboard("from", wallets), messageId);
          return new Response("OK", { status: 200 });
        }

        const typeLabel = type === "income" ? "📥 <b>CATAT PEMASUKAN BARU</b>" : "💸 <b>CATAT PENGELUARAN BARU</b>";
        const promptText = `${typeLabel}\n<blockquote>\n<b>Langkah 1/2:</b>\nPilih <b>Dompet / Rekening</b> yang digunakan:\n</blockquote>`;
        await sendOrEdit(chatId, promptText, walletKeyboard(type, wallets), messageId);
        return new Response("OK", { status: 200 });
      }

      // 2. Transfer Wizard - Step 1: Pick From Wallet
      if (data.startsWith("pick_transfer_from:")) {
        const fromWalletId = data.split(":")[1];
        const fromWallet = wallets.find((w: any) => w.id === fromWalletId) || wallets[0];
        await setSession(chatId, { step: "transfer_pick_to", fromWalletId: fromWallet.id, fromWalletName: fromWallet.name });
        await answerCallbackQuery(callbackId, `Pengirim: ${fromWallet.name}`);

        const promptText = `🔄 <b>TRANSFER DARI ${escapeHtml(fromWallet.name.toUpperCase())}</b>\n<blockquote>\n📤 <b>Rekening Asal:</b> ${escapeHtml(fromWallet.name)} (Saldo: <code>${formatIDR(fromWallet.balance)}</code>)\n\n<b>Langkah 2/3:</b>\nPilih <b>Rekening Tujuan (Penerima)</b>:\n</blockquote>`;
        await sendOrEdit(chatId, promptText, transferWalletKeyboard("to", wallets, fromWallet.id), messageId);
        return new Response("OK", { status: 200 });
      }

      // 3. Transfer Wizard - Step 2: Pick To Wallet
      if (data.startsWith("pick_transfer_to:")) {
        const toWalletId = data.split(":")[1];
        const toWallet = wallets.find((w: any) => w.id === toWalletId) || wallets[0];
        const currentSession = await getSession(chatId);
        const fromWalletId = currentSession?.fromWalletId || wallets[0]?.id;
        const fromWalletName = currentSession?.fromWalletName || wallets[0]?.name;

        await setSession(chatId, {
          step: "awaiting_transfer_amount",
          fromWalletId,
          fromWalletName,
          toWalletId: toWallet.id,
          toWalletName: toWallet.name
        });
        await answerCallbackQuery(callbackId, `Penerima: ${toWallet.name}`);

        const promptText = `🔄 <b>KONFIRMASI RUTE TRANSFER</b>\n<blockquote>\n📤 <b>Dari:</b> ${escapeHtml(fromWalletName)}\n📥 <b>Ke:</b> ${escapeHtml(toWallet.name)}\n</blockquote>\n\n<blockquote>\n<b>Langkah 3/3:</b>\nKetik <b>nominal transfer</b> dan <b>catatan</b> (opsional):\n💡 <i>Contoh: 100000 atau 50rb Topup DANA</i>\n</blockquote>`;
        const cancelKb = { inline_keyboard: [[{ text: "✕ Batalkan Transfer", callback_data: "cancel_wizard" }]] };
        await sendOrEdit(chatId, promptText, cancelKb, messageId);
        return new Response("OK", { status: 200 });
      }

      // 4. Regular Expense/Income Wallet Pick
      if (data.startsWith("pick_wallet:")) {
        const [, type, walletId] = data.split(":");
        const selectedWallet = wallets.find((w: any) => w.id === walletId) || wallets[0];
        await setSession(chatId, { step: "awaiting_amount_note", type, walletId: selectedWallet.id, walletName: selectedWallet.name });
        await answerCallbackQuery(callbackId, `Dompet ${selectedWallet.name} dipilih`);

        const isInc = type === "income";
        const promptText = `${isInc ? "📥 <b>PEMASUKAN KE" : "💸 <b>PENGELUARAN DARI"} ${escapeHtml(selectedWallet.name.toUpperCase())}</b>\n<blockquote>\n💳 <b>Dompet:</b> ${escapeHtml(selectedWallet.name)} (Saldo: <code>${formatIDR(selectedWallet.balance)}</code>)\n\n<b>Langkah 2/2:</b>\nKetik <b>nominal</b> dan <b>catatan</b> transaksi:\n💡 <i>Contoh: 50000 Nasi Padang atau 35rb Kopi</i>\n</blockquote>`;
        const cancelKb = { inline_keyboard: [[{ text: "✕ Batalkan Input", callback_data: "cancel_wizard" }]] };
        await sendOrEdit(chatId, promptText, cancelKb, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data === "cancel_wizard") {
        await clearSession(chatId);
        await answerCallbackQuery(callbackId, "Pencatatan dibatalkan");
        const cancelText = "❌ <b>Pencatatan dibatalkan.</b>\n\nKembali ke menu utama:";
        const v = getView("menu", appState);
        await sendOrEdit(chatId, cancelText, v.kb, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data.startsWith("del_tx:")) {
        const txId = data.slice(7);
        await answerCallbackQuery(callbackId, "Memproses pembatalan...");
        await deleteAndRefund(txId, appState, chatId, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data === "exec_pending_multi_tx") {
        const currentSession = await getSession(chatId);
        const pending = currentSession?.pendingTransactions || [];
        if (pending.length === 0) {
          await answerCallbackQuery(callbackId, "Tidak ada transaksi yang tertunda.", true);
          return new Response("OK", { status: 200 });
        }
        await answerCallbackQuery(callbackId, `Mengeksekusi ${pending.length} transaksi...`);
        await executePendingTransactions(pending, appState, chatId, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data === "cancel_pending_multi_tx") {
        await clearSession(chatId);
        await answerCallbackQuery(callbackId, "Seluruh transaksi dibatalkan.");
        const cancelText = "✕ <b>Pencatatan dibatalkan.</b>\n\nSeluruh mutasi tidak jadi dicatat ke saldo.";
        const v = getView("menu", appState);
        await sendOrEdit(chatId, cancelText, v.kb, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data === "action:sync_bibit") {
        await answerCallbackQuery(callbackId, "🔄 Menyinkronkan harga Bibit & Treasury...");
        await sendChatAction(chatId, "typing");
        await syncMarketData();
        const { data: freshState } = await supabase.from("fintrack_app_state").select("*").eq("id", "default_user").single();
        const v = getView("bibit", freshState || appState);
        await sendOrEdit(chatId, v.text, v.kb, messageId);
        return new Response("OK", { status: 200 });
      }

      if (data.startsWith("view:")) {
        const viewType = data.slice(5);
        await answerCallbackQuery(callbackId);
        const v = getView(viewType, appState);
        await sendOrEdit(chatId, v.text, v.kb, messageId);
        return new Response("OK", { status: 200 });
      }

      return new Response("Unhandled callback", { status: 200 });
    }

    // B. TEXT MESSAGES
    const msg = update?.message;
    if (!msg || !msg.text) return new Response("No message to process", { status: 200 });

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const lower = text.toLowerCase();

    // Beri reaksi instan ⚡ di bubble chat pengguna (dopamine micro-interaction)
    setReaction(chatId, msg.message_id, "⚡");

    const session = await getSession(chatId);

    if (lower === "/batal" || lower === "batal") {
      setReaction(chatId, msg.message_id, "👌");
      await clearSession(chatId);
      const v = getView("menu", appState);
      await sendOrEdit(chatId, "✕ <b>Sesi dibatalkan.</b>\n\nSilakan pilih menu di bawah:", v.kb);
      return new Response("OK", { status: 200 });
    }

    // Handle Wizard Step 3 (Transfer Amount + Note)
    if (session && session.step === "awaiting_transfer_amount") {
      const liveRate = await getLiveUsdRate();
      const { amount, note: rawNote } = parseAmountAndNote(text, liveRate);
      if (amount <= 0) {
        const errorMsg = "⚠️ <b>Nominal belum terbaca atau tidak valid!</b>\n\nMohon ketik nominal transfer dengan jelas.\nContoh:\n• <code>100000</code>\n• <code>50rb</code>\n• <code>1.5jt Bayar kos</code>\n\n<i>(Atau ketik <code>/batal</code> untuk membatalkan)</i>";
        await sendOrEdit(chatId, errorMsg);
        return new Response("OK", { status: 200 });
      }

      let note = rawNote;
      if (!note || note.length < 2) note = `Transfer dari ${session.fromWalletName} ke ${session.toWalletName}`;
      note = note.charAt(0).toUpperCase() + note.slice(1);

      await recordTransfer(
        session.fromWalletId,
        session.fromWalletName,
        session.toWalletId,
        session.toWalletName,
        amount,
        note,
        appState,
        chatId,
        msg.message_id
      );
      return new Response("OK", { status: 200 });
    }

    // Handle Wizard Step 2 (Amount + Note input for income/expense)
    if (session && session.step === "awaiting_amount_note") {
      const liveRate = await getLiveUsdRate();
      const { amount, note: rawNote } = parseAmountAndNote(text, liveRate);
      if (amount <= 0) {
        const errorMsg = "⚠️ <b>Nominal belum terbaca atau tidak valid!</b>\n\nMohon ketik nominal dan catatan dengan jelas.\nContoh:\n• <code>50000 Nasi Padang</code>\n• <code>35rb Kopi</code>\n• <code>100k</code>\n\n<i>(Atau ketik <code>/batal</code> untuk membatalkan)</i>";
        await sendOrEdit(chatId, errorMsg);
        return new Response("OK", { status: 200 });
      }

      let note = rawNote;
      if (!note || note.length < 2) note = session.type === "income" ? "Pemasukan Tambahan" : "Pengeluaran";
      note = note.charAt(0).toUpperCase() + note.slice(1);

      await recordTransaction(session.type, session.walletId, session.walletName, amount, note, appState, chatId, msg.message_id);
      return new Response("OK", { status: 200 });
    }

    // Slash Commands & Menu Shortcuts
    if (lower === "/start" || lower === "/menu" || lower === "/help") {
      const v = getView("menu", appState);
      await sendOrEdit(chatId, v.text, v.kb);
      return new Response("OK", { status: 200 });
    }

    if (lower === "/transfer") {
      const promptText = `🔄 <b>TRANSFER ANTAR REKENING</b>\n<blockquote>\n<b>Langkah 1/3:</b>\nPilih <b>Rekening Asal (Pengirim)</b> di bawah:\n</blockquote>`;
      await sendOrEdit(chatId, promptText, transferWalletKeyboard("from", wallets));
      return new Response("OK", { status: 200 });
    }

    if (["/saldo", "/networth", "/emas", "/bibit", "/laporan"].includes(lower)) {
      const v = getView(lower.slice(1), appState);
      if (lower === "/networth") {
        await sendAnimationOrEdit(chatId, COINS_GIF, v.text, v.kb);
      } else {
        await sendOrEdit(chatId, v.text, v.kb);
      }
      return new Response("OK", { status: 200 });
    }

    if (lower === "/sync" || lower === "/updatebibit" || lower === "sync") {
      const waitMsg = await sendOrEdit(chatId, "🔄 <i>Sedang menyinkronkan data harga Bibit & Treasury terbaru...</i>");
      await sendChatAction(chatId, "typing");
      await syncMarketData();
      const { data: freshState } = await supabase.from("fintrack_app_state").select("*").eq("id", "default_user").single();
      const v = getView("bibit", freshState || appState);
      await sendOrEdit(chatId, `✅ <b>SINKRONISASI SELESAI!</b>\n\n${v.text}`, v.kb, waitMsg?.result?.message_id);
      return new Response("OK", { status: 200 });
    }


    // Dual-Engine Multi-Transaction AI Parser (Hermes + Fallback) with Live Thinking UX
    // 1. Kirim pesan placeholder seketika (0.1s)
    const waitMsg = await sendOrEdit(chatId, "🔮 <i>Menganalisis transaksi dengan Gemini AI...</i>");
    const waitMsgId = waitMsg?.result?.message_id;

    // 2. Jalankan typing heartbeat setiap 4 detik tanpa jeda mati
    await sendChatAction(chatId, "typing");
    const typingInterval = setInterval(() => {
      sendChatAction(chatId, "typing");
    }, 4000);

    let parseResult: any = null;
    try {
      parseResult = await parseWithHermesOrFallback(text, wallets);
    } finally {
      clearInterval(typingInterval);
    }

    // 3. Edit pesan placeholder menjadi Kartu Konfirmasi Transaksi
    if (parseResult && parseResult.transactions && parseResult.transactions.length > 0 && parseResult.transactions.some((t: any) => t.amount > 0)) {
      await setSession(chatId, { step: "awaiting_multi_tx_confirm", pendingTransactions: parseResult.transactions });
      const { text: confirmText, kb } = renderConfirmationCard(parseResult, wallets);
      await sendOrEdit(chatId, confirmText, kb, waitMsgId);
      return new Response("OK", { status: 200 });
    }

    // Default unrecognized message
    const defaultReply = "👋 <b>Halo!</b> Saya belum mendeteksi format transaksi dari pesan Anda.\n\n💡 <i>Ketik santai langsung di sini, contoh:</i>\n• <code>kopi 35k bca</code>\n• <code>makan 50k, bensin 30k sea</code>\n• <code>tf 100k bca ke dana</code>\n\nAtau gunakan menu interaktif di bawah:";
    const v = getView("menu", appState);
    await sendOrEdit(chatId, defaultReply, v.kb, waitMsgId);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("Telegram handler error:", err);
    return new Response("Error: " + err.message, { status: 500 });
  }
}

// ==========================================
// RECEIPT SCANNER & OCR WITH GEMINI VISION
// ==========================================
async function scanReceiptWithGemini(params: { imageBase64?: string; mimeType?: string; text?: string }) {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY wajib diset di file .env!");
  }
  
  // Fetch latest state to get active wallets
  const { data: stateData } = await supabase.from("fintrack_app_state").select("wallets").eq("id", "default_user").single();
  const wallets = stateData?.wallets || [];
  const walletListStr = wallets.map((w: any) => `${w.name} (id: "${w.id}")`).join(", ");

  const candidateModels = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash"
  ];

  const systemPrompt = `You are an expert Indonesian financial transaction and receipt extractor.
Analyze the transaction receipt, QRIS payment, or bank transfer proof (from apps like BCA, myBCA, DANA, SeaBank, Bank Mandiri, BRI, BNI, GoPay, ShopeePay, OVO, etc.).

Active User Wallets:
${walletListStr}

Valid Categories:
"Makanan & Minuman", "Belanja & Kebutuhan", "Transportasi", "Tagihan & Utilitas", "Hiburan & Hobi", "Keluarga & Pribadi", "Kesehatan", "Transfer Antar Rekening", "Gaji & Pendapatan", "Lain-lain"

Extract and return ONLY a single valid JSON object matching this schema:
{
  "bank": "Name of the bank or wallet, e.g. Bank BCA, DANA, SeaBank",
  "matchedWalletId": "the matching wallet id from Active User Wallets, or null",
  "amount": 45000,
  "merchant": "Name of merchant/store or receiver, e.g. Kopi Kenangan",
  "type": "expense",
  "category": "Makanan & Minuman",
  "note": "QRIS Kopi Kenangan",
  "date": "YYYY-MM-DD HH:mm or null",
  "confidence": 0.95
}`;

  const parts: any[] = [{ text: systemPrompt }];
  if (params.text) {
    parts.push({ text: `Transaction Text Context: ${params.text}` });
  }

  if (params.imageBase64) {
    let rawBase64 = params.imageBase64;
    let mime = params.mimeType || "image/jpeg";
    if (rawBase64.startsWith("data:")) {
      const commaIdx = rawBase64.indexOf(",");
      const header = rawBase64.slice(0, commaIdx);
      const match = header.match(/data:(.*?);base64/);
      if (match) mime = match[1];
      rawBase64 = rawBase64.slice(commaIdx + 1);
    }
    parts.push({
      inlineData: {
        mimeType: mime,
        data: rawBase64
      }
    });
  } else if (!params.text) {
    throw new Error("No image or text provided for receipt scanning");
  }

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 600
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanJson = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        
        // Auto fallback wallet matching if not matched
        if (!parsed.matchedWalletId && parsed.bank) {
          const bankLower = (parsed.bank || "").toLowerCase();
          const found = wallets.find((w: any) => 
            w.name.toLowerCase().includes(bankLower) || bankLower.includes(w.name.toLowerCase())
          );
          if (found) {
            parsed.matchedWalletId = found.id;
            parsed.bank = found.name;
          }
        }
        
        // Default to BCA or first bank wallet if still no match
        if (!parsed.matchedWalletId && wallets.length > 0) {
          const bca = wallets.find((w: any) => w.name.toLowerCase().includes("bca"));
          parsed.matchedWalletId = bca ? bca.id : wallets[0].id;
          parsed.bank = bca ? bca.name : wallets[0].name;
        }

        return {
          success: true,
          model,
          data: parsed,
          wallets: wallets.map((w: any) => ({ id: w.id, name: w.name, balance: w.balance, color: w.color, icon: w.icon }))
        };
      } else {
        console.warn(`[Receipt AI] Model ${model} HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.warn(`[Receipt AI] Model ${model} failed:`, e.message);
    }
  }
  throw new Error("Gagal menganalisis struk transaksi dengan AI.");
}

async function recordReceiptTransaction(txData: {
  walletId: string;
  amount: number;
  type?: string;
  category?: string;
  note?: string;
  date?: string;
}) {
  const { data: appState, error } = await supabase.from("fintrack_app_state").select("*").eq("id", "default_user").single();
  if (error || !appState) throw new Error("Gagal mengambil data state FinTrack");

  let wallets = appState.wallets || [];
  let transactions = appState.transactions || [];
  const investments = appState.investments || {};
  const bibitAssets = appState.bibit_assets || [];

  const targetWallet = wallets.find((w: any) => w.id === txData.walletId);
  if (!targetWallet) throw new Error(`Dompet dengan ID ${txData.walletId} tidak ditemukan`);

  const amount = Math.round(Number(txData.amount)) || 0;
  const type = txData.type || "expense";
  const isInc = type === "income";

  // Deduct or add to wallet
  wallets = wallets.map((w: any) => {
    if (w.id === targetWallet.id) {
      const cur = Number(w.balance) || 0;
      return { ...w, balance: isInc ? cur + amount : cur - amount };
    }
    return w;
  });

  const newTx = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    amount,
    walletId: targetWallet.id,
    walletName: targetWallet.name,
    category: txData.category || (isInc ? "Gaji & Pendapatan" : "Pengeluaran"),
    note: txData.note || (isInc ? "Pemasukan" : "Pengeluaran QRIS"),
    date: txData.date || new Date().toISOString()
  };

  transactions = [newTx, ...transactions];

  const { error: upsertErr } = await supabase.from("fintrack_app_state").upsert({
    id: "default_user",
    wallets,
    investments,
    bibit_assets: bibitAssets,
    transactions,
    updated_at: new Date().toISOString()
  });

  if (upsertErr) throw new Error("Gagal menyimpan transaksi ke database: " + upsertErr.message);

  const newCash = wallets.reduce((s: number, w: any) => s + (Number(w.balance) || 0), 0);
  const goldVal = (Number(investments.treasury?.grams) || 0) * (Number(investments.treasury?.sellPrice) || 2368901);
  const bibitVal = bibitAssets.reduce((s: number, a: any) => s + ((Number(a.units) || 0) * (Number(a.currentNav) || 0)), 0);
  const newNetWorth = newCash + goldVal + bibitVal;

  sendDiscordNotification({
    title: isInc ? "💰 Pemasukan Baru (Receipt/AI)" : "💸 Pengeluaran Baru (Receipt/AI)",
    description: `**${formatIDR(amount)}** dicatat ke dompet **${targetWallet.name}**`,
    color: isInc ? 0x2ecc71 : 0xe74c3c,
    fields: [
      { name: "Kategori", value: newTx.category, inline: true },
      { name: "Catatan", value: newTx.note, inline: true },
      { name: "Sisa Saldo Dompet", value: formatIDR(isInc ? Number(targetWallet.balance) + amount : Number(targetWallet.balance) - amount), inline: false },
      { name: "Total Kekayaan Bersih", value: formatIDR(newNetWorth), inline: false }
    ]
  }).catch(() => {});

  return {
    success: true,
    transaction: newTx,
    wallet: targetWallet,
    newWalletBalance: isInc ? Number(targetWallet.balance) + amount : Number(targetWallet.balance) - amount,
    newNetWorth
  };
}

// ==========================================
// PIN AUTHENTICATION & SECURITY GATE
// ==========================================
const FINTRACK_PIN = Deno.env.get("FINTRACK_PIN") || "200111";
const AUTH_SECRET = Deno.env.get("AUTH_SECRET") || "fintrack_sec_gate_48a93bf81d9f82";
const pinRateLimitMap = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

async function signSessionToken(expiresAt: number, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = `${expiresAt}:${pin}`;
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${expiresAt}.${hexSig}`;
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    if (!token) return false;
    const [expStr, hexSig] = token.split(".");
    const exp = Number(expStr);
    if (!exp || Date.now() > exp) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data = `${expStr}:${FINTRACK_PIN}`;
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hexSig === expectedHex;
  } catch {
    return false;
  }
}

// Start HTTP server for health check & optional webhook & live rates & receipt scanner
Deno.serve({ port: 8081 }, async (req: Request) => {
  const url = new URL(req.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 0a. Auth: Verify PIN (Rate-Limited, Zero Plaintext Leak)
  if (url.pathname === "/api/auth/verify-pin" || url.pathname === "/api/verify-pin") {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    const ip = getClientIp(req);
    const now = Date.now();
    const rateInfo = pinRateLimitMap.get(ip);
    if (rateInfo && rateInfo.lockedUntil > now) {
      const waitSec = Math.ceil((rateInfo.lockedUntil - now) / 1000);
      return new Response(JSON.stringify({
        success: false,
        error: `Terlalu banyak percobaan salah! Akses diblokir sementara selama ${waitSec} detik.`,
        locked: true
      }), { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    try {
      const body = await req.json();
      const enteredPin = String(body.pin || "").trim();
      const remember = !!body.remember;

      if (enteredPin === FINTRACK_PIN) {
        pinRateLimitMap.delete(ip);
        const days = remember ? 360 : 1;
        const expiresAt = now + days * 24 * 60 * 60 * 1000;
        const token = await signSessionToken(expiresAt, FINTRACK_PIN);

        return new Response(JSON.stringify({
          success: true,
          token,
          expiresAt,
          config: {
            SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
            SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
            APP_NAME: Deno.env.get("APP_NAME") || "FinTrack"
          }
        }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      } else {
        const count = (rateInfo ? rateInfo.count : 0) + 1;
        let lockedUntil = 0;
        if (count >= 5) {
          lockedUntil = now + 15 * 60 * 1000; // 15 mins
        }
        pinRateLimitMap.set(ip, { count, lockedUntil });
        const remaining = Math.max(0, 5 - count);
        const errMsg = remaining === 0
          ? "PIN salah 5 kali! Akses diblokir selama 15 menit demi keamanan."
          : `PIN salah! Sisa percobaan: ${remaining} kali.`;
        return new Response(JSON.stringify({
          success: false,
          error: errMsg,
          remainingAttempts: remaining
        }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400, headers: corsHeaders });
    }
  }

  // 0b. Auth: Verify Session
  if (url.pathname === "/api/auth/verify-session" || url.pathname === "/api/verify-session") {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    try {
      const body = await req.json();
      const token = String(body.token || "").trim();
      const isValid = await verifySessionToken(token);
      if (isValid) {
        return new Response(JSON.stringify({
          valid: true,
          config: {
            SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
            SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
            APP_NAME: Deno.env.get("APP_NAME") || "FinTrack"
          }
        }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      return new Response(JSON.stringify({ valid: false, error: "Session expired or invalid" }), { status: 401, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ valid: false, error: err.message }), { status: 400, headers: corsHeaders });
    }
  }

  // 0c. Runtime Configuration for Web Client (Zero Leak: Anon Key only if valid session)
  if (url.pathname === "/api/config.js" || url.pathname === "/config.js" || url.pathname.endsWith("/config.js")) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
    const isAuthed = await verifySessionToken(token);
    const cfg = isAuthed ? {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
      APP_NAME: Deno.env.get("APP_NAME") || "FinTrack"
    } : {
      APP_NAME: Deno.env.get("APP_NAME") || "FinTrack"
    };
    return new Response(`window.__FINTRACK_CONFIG__ = Object.assign(window.__FINTRACK_CONFIG__ || {}, ${JSON.stringify(cfg)});`, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        ...corsHeaders,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  if (url.pathname === "/api/config" || url.pathname === "/config") {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
    const isAuthed = await verifySessionToken(token);
    const cfg = isAuthed ? {
      supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      appName: Deno.env.get("APP_NAME") || "FinTrack"
    } : {
      appName: Deno.env.get("APP_NAME") || "FinTrack"
    };
    return new Response(JSON.stringify(cfg), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }

  // 1. Live USD Rates
  if (url.pathname === "/api/rates/usd" || url.pathname === "/rates/usd" || url.pathname.endsWith("/usd")) {
    const rate = await getLiveUsdRate();
    return new Response(JSON.stringify({ rates: { IDR: rate }, rate, timestamp: Date.now(), source: "yahoo_finance_realtime" }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Cache-Control": "public, max-age=60"
      }
    });
  }

  // 2. Receipt AI Scanner
  if (url.pathname === "/api/scan-receipt" || url.pathname.endsWith("/scan-receipt")) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    try {
      const contentType = req.headers.get("content-type") || "";
      let params: { imageBase64?: string; mimeType?: string; text?: string } = {};

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = (formData.get("receipt") || formData.get("image") || formData.get("file")) as File | null;
        const text = (formData.get("text") || formData.get("title") || "") as string;
        
        if (file) {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          const len = bytes.byteLength;
          const chunkSize = 32768;
          for (let i = 0; i < len; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
          }
          const base64 = btoa(binary);
          params = {
            imageBase64: base64,
            mimeType: file.type || "image/jpeg",
            text
          };
        } else {
          params = { text };
        }
      } else {
        params = await req.json();
      }

      const result = await scanReceiptWithGemini(params);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (err: any) {
      console.error("[Scan Receipt Error]:", err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  // 3. Record Confirmed Receipt Transaction
  if (url.pathname === "/api/record-receipt-transaction" || url.pathname.endsWith("/record-receipt-transaction")) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    try {
      const payload = await req.json();
      const result = await recordReceiptTransaction(payload);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (err: any) {
      console.error("[Record Receipt Error]:", err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  // 4. AI Multi-Transaction Parser (Powers both Web & Telegram with Gemini)
  if (
    url.pathname === "/api/ai/v1/chat/completions" ||
    url.pathname === "/api/parse-transaction" ||
    url.pathname === "/api/ai-parse" ||
    url.pathname.endsWith("/chat/completions") ||
    url.pathname.endsWith("/parse-transaction")
  ) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    try {
      const body = await req.json();
      let userText = "";
      let userWallets: any[] = [];

      if (body.messages && Array.isArray(body.messages)) {
        const lastUser = body.messages.slice().reverse().find((m: any) => m.role === "user");
        userText = (lastUser?.content || "").trim();
      } else if (body.text) {
        userText = String(body.text).trim();
      }

      if (body.wallets && Array.isArray(body.wallets) && body.wallets.length > 0) {
        userWallets = body.wallets;
      } else {
        const { data: stateData } = await supabase.from("fintrack_app_state").select("wallets").eq("id", "default_user").single();
        userWallets = stateData?.wallets || [];
      }

      const parseResult = await parseWithHermesOrFallback(userText, userWallets);

      // Return OpenAI Chat Completion format if requested via /chat/completions or messages
      if (url.pathname.includes("/chat/completions") || body.messages) {
        const txArray = (parseResult.transactions || []).map((t: any) => ({
          type: t.type,
          amount: t.amount,
          wallet: t.walletName,
          fromWallet: t.fromWalletName || (t.type === "transfer" ? t.walletName : ""),
          toWallet: t.toWalletName || "",
          category: t.category,
          note: t.note
        }));

        return new Response(JSON.stringify({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: parseResult.engineName || "gemini-3.5-flash-lite",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify(txArray)
              },
              finish_reason: "stop"
            }
          ]
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      return new Response(JSON.stringify(parseResult), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (err: any) {
      console.error("[AI Parse Handler Error]:", err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }

  // 4. Telegram Webhook Fallback Handler
  // Catatan Arsitektur: FinTrack Bot secara default menggunakan mode Long-Polling (startPolling())
  // agar dapat langsung berjalan tanpa memerlukan IP publik/domain SSL webhook terdaftar.
  // Handler POST ini dipertahankan sebagai opsi cadangan jika ingin beralih ke mode Webhook.
  if (req.method === "POST") {
    try {
      const update = await req.json();
      return await handleUpdate(update);
    } catch (e: any) {
      return new Response("Error: " + (e?.message || e), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("FinTrack API & Bot Service is active", { status: 200, headers: corsHeaders });
});

// Start Telegram Long Polling
async function startPolling() {
  console.log("Menghapus webhook lama (jika ada)...");
  try {
    const delRes = await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=false`);
    const delJson = await delRes.json();
    console.log("Status deleteWebhook:", JSON.stringify(delJson));
  } catch (e) {
    console.warn("Gagal deleteWebhook:", e);
  }

  console.log("FinTrack Telegram Bot Long-Polling aktif!");
  let offset = 0;
  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`, {
        signal: AbortSignal.timeout(45000)
      });
      if (!res.ok) {
        console.error("Telegram API HTTP error:", res.status);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch(err => {
            console.error("Error handling update:", err);
          });
        }
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      if (err.name !== "TimeoutError") {
        console.error("Polling network error:", err.message || err);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// Auto-sync market data (Bibit & Treasury) setiap 1 jam sekali
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(async () => {
  try {
    console.log("[AutoSync] Menjalankan sinkronisasi otomatis Bibit & Treasury (1 jam sekali)...");
    await syncMarketData();
  } catch (e) {
    console.error("[AutoSync] Error sinkronisasi berkala:", e);
  }
}, ONE_HOUR_MS);

// Jalankan sinkronisasi otomatis saat bot startup
syncMarketData().catch(e => console.error("[StartupSync] Error:", e));

startPolling();
