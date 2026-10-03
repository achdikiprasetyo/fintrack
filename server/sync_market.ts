import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

function formatIDR(num: number): string {
  return "Rp " + Math.round(num || 0).toLocaleString("id-ID");
}

function getWibTimeString(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  return `${String(wib.getHours()).padStart(2, "0")}:${String(wib.getMinutes()).padStart(2, "0")}`;
}

export async function fetchBibitNav(code: string, slug: string) {
  try {
    const url = `https://bibit.id/reksadana/${code}/${slug}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match || !match[1]) throw new Error("No __NEXT_DATA__ tag found");
    const json = JSON.parse(match[1]);
    const p = json?.props?.pageProps?.productDetail;
    if (p && p.nav && typeof p.nav.value === "number") {
      const cagr1y = p.cagr?.["1y"];
      return {
        success: true,
        name: p.name || slug,
        nav: Number(p.nav.value),
        navDate: p.nav.date,
        oneYearReturn: typeof cagr1y === "number" ? parseFloat((cagr1y * 100).toFixed(2)) : null
      };
    }
    return { success: false, error: "Missing nav.value in productDetail" };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function fetchTreasuryGold() {
  try {
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    const body = {
      start_date: fmt(yesterday),
      end_date: fmt(now),
      type: "daily",
      region: "id",
      assetType: "gold"
    };
    const res = await fetch("https://webv2-api.treasury.id/api/v1/external/wp/gold/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const prices = json?.data?.attributes?.prices;
    if (Array.isArray(prices) && prices.length > 0) {
      const latest = prices[prices.length - 1];
      return {
        success: true,
        buyPrice: Number(latest.buy_price),
        sellPrice: Number(latest.sell_price),
        datetime: latest.datetime
      };
    }
    return { success: false, error: "Empty prices array from Treasury" };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function syncMarketData() {
  console.log(`[${new Date().toISOString()}] Memulai sinkronisasi market (Bibit & Treasury)...`);
  const { data: appState, error } = await supabase.from("fintrack_app_state").select("*").eq("id", "default_user").single();
  if (error || !appState) {
    console.error("Gagal membaca state dari Supabase:", error?.message);
    return { success: false, error: error?.message };
  }

  let updatedBibitCount = 0;
  const bibitAssets = (appState.bibit_assets || []).map((a: any) => ({ ...a }));
  const investments = { ...appState.investments };
  const wibTime = getWibTimeString();

  // 1. Sync Bibit Assets
  for (let i = 0; i < bibitAssets.length; i++) {
    const a = bibitAssets[i];
    let code = a.productCode;
    let slug = a.slug;

    // Normalisasi fallback jika belum diset
    if (a.id === "bibit-bahana-syariah-g" || (a.name && a.name.toLowerCase().includes("bahana likuid syariah"))) {
      code = code || "RD3595";
      slug = slug || "bahana-likuid-syariah-kelas-g";
    } else if (a.id === "bibit-bahana-likuid-plus" || (a.name && a.name.toLowerCase().includes("bahana likuid plus"))) {
      code = code || "RD140";
      slug = slug || "bahana-likuid-plus";
    } else if (a.id === "bibit-abf-bond" || (a.name && a.name.toLowerCase().includes("abf indonesia"))) {
      code = code || "RD13";
      slug = slug || "abf-indonesia-bond-index-fund";
    }

    if (code && slug) {
      console.log(`Fetching Bibit ${a.name} (${code}/${slug})...`);
      const res = await fetchBibitNav(code, slug);
      if (res.success && res.nav) {
        console.log(`  -> NAV baru: ${res.nav} (sebelumnya: ${a.currentNav})`);
        bibitAssets[i] = {
          ...a,
          productCode: code,
          slug: slug,
          currentNav: res.nav,
          oneYearReturn: res.oneYearReturn ?? a.oneYearReturn,
          lastUpdated: `Live (${wibTime})`,
          isLive: true
        };
        updatedBibitCount++;
      } else {
        console.warn(`  -> Gagal update ${a.name}:`, res.error);
      }
    }
  }

  // 2. Sync Treasury Gold
  const goldRes = await fetchTreasuryGold();
  if (goldRes.success && goldRes.sellPrice && investments.treasury) {
    console.log(`Treasury Gold update -> Buy: ${goldRes.buyPrice}, Sell: ${goldRes.sellPrice}`);
    investments.treasury = {
      ...investments.treasury,
      buyPrice: goldRes.buyPrice,
      sellPrice: goldRes.sellPrice,
      lastUpdated: goldRes.datetime || `Live (${wibTime})`,
      status: "live"
    };
  }

  // 3. Persist to Supabase
  const { error: upsertErr } = await supabase.from("fintrack_app_state").update({
    bibit_assets: bibitAssets,
    investments: investments,
    updated_at: new Date().toISOString()
  }).eq("id", "default_user");

  if (upsertErr) {
    console.error("Gagal update fintrack_app_state di Supabase:", upsertErr.message);
    return { success: false, error: upsertErr.message };
  }

  console.log(`✅ Sinkronisasi berhasil! ${updatedBibitCount} produk Bibit & Treasury telah di-update.`);

  const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (discordWebhookUrl && discordWebhookUrl.startsWith("http")) {
    try {
      const treasuryGold = investments?.treasury;
      await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: Deno.env.get("APP_NAME") || "FinTrack",
          embeds: [{
            title: "📈 Sinkronisasi Pasar Live Berhasil",
            description: `Berhasil memperbarui data pasar **Bibit (${updatedBibitCount} produk)** dan **Emas Treasury**.`,
            color: 0xf59e0b,
            fields: [
              { name: "Harga Jual Emas", value: treasuryGold?.sellPrice ? formatIDR(treasuryGold.sellPrice) + "/gr" : "-", inline: true },
              { name: "Harga Beli Emas", value: treasuryGold?.buyPrice ? formatIDR(treasuryGold.buyPrice) + "/gr" : "-", inline: true }
            ],
            footer: { text: "FinTrack Market Sync" },
            timestamp: new Date().toISOString()
          }]
        }),
        signal: AbortSignal.timeout(5000)
      });
    } catch {}
  }
  return {
    success: true,
    updatedBibitCount,
    bibitAssets,
    investments
  };
}

if (import.meta.main) {
  const result = await syncMarketData();
  console.log("Result:", JSON.stringify(result, null, 2));
}
