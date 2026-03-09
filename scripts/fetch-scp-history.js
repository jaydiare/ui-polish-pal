// scripts/fetch-scp-history.js
// One-time script: Fetch 5-year historical price data from SportsCardsPro
// for Acuña #US250 and Torres #US200 rookie cards.
//
// Uses the SportsCardsPro API (/api/product) for current prices, and
// Puppeteer headless Chrome to render the product page and extract
// Highcharts chart data for historical prices.
//
// Requires: SPORTSCARDSPRO secret (API token), puppeteer installed
// Output: data/scp-history.json, public/data/scp-history.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "..", "data", "scp-history.json");
const PUBLIC_PATH = path.join(__dirname, "..", "public", "data", "scp-history.json");

const API_TOKEN = process.env.SPORTSCARDSPRO;
if (!API_TOKEN) {
  console.error("❌ SPORTSCARDSPRO secret not set.");
  process.exit(1);
}

const BASE_API = "https://www.pricecharting.com/api/product";
const BASE_URL = "https://www.sportscardspro.com/game/baseball-cards-2018-topps-update";

const CARDS = [
  {
    key: "us250-acuna",
    name: "Ronald Acuna Jr.",
    cardTitle: "2018 Topps Update Series #US250 Ronald Acuna Jr. RC",
    productId: "1559264",
    slug: "ronald-acuna-jr-us250",
  },
  {
    key: "us200-torres",
    name: "Gleyber Torres",
    cardTitle: "2018 Topps Update #US200 Gleyber Torres RC",
    productId: "1559160",
    slug: "gleyber-torres-us200",
  },
];

const SCP_GRADE_MAP = {
  loose: { label: "Ungraded", grade: "ungraded" },
  used: { label: "Ungraded", grade: "ungraded" },
  cib: { label: "Grade 9", grade: "9" },
  new: { label: "PSA 10", grade: "10" },
  graded: { label: "Grade 9", grade: "9" },
  boxonly: { label: "Grade 9.5", grade: "9.5" },
  manualonly: { label: "PSA 10", grade: "10" },
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch current prices from the SportsCardsPro API
 */
async function fetchCurrentPrices(productId) {
  const url = `${BASE_API}?t=${API_TOKEN}&id=${productId}`;
  console.log(`  📡 API: Fetching current prices for product ${productId}...`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.error(`  ❌ API error: ${res.status} ${res.statusText}`);
    return null;
  }
  const data = await res.json();
  if (data.status !== "success") {
    console.error(`  ❌ API returned error: ${data["error-message"] || "unknown"}`);
    return null;
  }
  return data;
}

/**
 * Use Puppeteer to render the product page and extract Highcharts series data.
 * Highcharts stores rendered series data on window.Highcharts.charts[].
 */
async function fetchChartDataWithPuppeteer(browser, slug) {
  const url = `${BASE_URL}/${slug}`;
  console.log(`  🌐 Puppeteer: Loading ${url}`);

  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // Navigate and wait for network to settle
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait a bit extra for Highcharts to fully render
    await sleep(3000);

    // Extract chart data from Highcharts global object
    const chartData = await page.evaluate(() => {
      const result = {};

      // Method 1: Highcharts.charts array (most reliable)
      if (window.Highcharts && window.Highcharts.charts) {
        const charts = window.Highcharts.charts.filter(Boolean);
        for (let ci = 0; ci < charts.length; ci++) {
          const chart = charts[ci];
          if (!chart.series) continue;
          for (const series of chart.series) {
            if (!series.data || series.data.length === 0) continue;
            const name = series.name || series.options?.name || `series_${ci}`;
            const points = series.data
              .filter((p) => p && p.x != null && p.y != null)
              .map((p) => [p.x, p.y]);
            if (points.length > 0) {
              result[name] = points;
            }
          }
        }
      }

      // Method 2: Look for global chart data variables
      for (const key of ["chart_data", "price_data", "vgpc"]) {
        if (window[key]) {
          try {
            const obj = window[key];
            if (typeof obj === "object") {
              for (const [k, v] of Object.entries(obj)) {
                if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
                  result[`${key}_${k}`] = v;
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }

      return result;
    });

    const seriesCount = Object.keys(chartData).length;
    console.log(`  📊 Extracted ${seriesCount} chart series from Highcharts`);

    if (seriesCount === 0) {
      // Fallback: extract from inline scripts via page content
      console.log(`  ⚠️  No Highcharts object found, trying inline script extraction...`);
      const fallbackData = await page.evaluate(() => {
        const scripts = document.querySelectorAll("script:not([src])");
        const result = {};
        for (const script of scripts) {
          const text = script.textContent || "";
          if (text.length < 200) continue;

          // Look for data arrays with name/data pattern
          const regex =
            /name\s*:\s*["']([^"']+)["'][^}]*?data\s*:\s*(\[\s*\[[\s\S]*?\]\s*\])/g;
          let m;
          while ((m = regex.exec(text)) !== null) {
            try {
              result[m[1]] = JSON.parse(m[2]);
            } catch {
              // try converting Date.UTC
              try {
                const converted = m[2].replace(
                  /Date\.UTC\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g,
                  (_, y, mo, d) =>
                    String(Date.UTC(parseInt(y), parseInt(mo), parseInt(d)))
                );
                result[m[1]] = JSON.parse(converted);
              } catch {
                // skip
              }
            }
          }

          // Look for chart_data["key"] = [[ts, price], ...] pattern
          const dataRegex =
            /(?:chart_data|price_data)\s*\[["'](\w+)["']\]\s*=\s*(\[\s*\[[\s\S]*?\]\s*\]);/g;
          let dm;
          while ((dm = dataRegex.exec(text)) !== null) {
            try {
              result[dm[1]] = JSON.parse(dm[2]);
            } catch {
              // skip
            }
          }
        }
        return result;
      });

      const fbCount = Object.keys(fallbackData).length;
      if (fbCount > 0) {
        console.log(`  📊 Fallback extracted ${fbCount} series from inline scripts`);
        Object.assign(chartData, fallbackData);
      }
    }

    await page.close();
    return chartData;
  } catch (err) {
    console.error(`  ❌ Puppeteer error: ${err.message}`);
    await page.close();
    return {};
  }
}

/**
 * Convert chart data timestamps to structured history
 */
function normalizeChartSeries(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  return rawData
    .filter((point) => Array.isArray(point) && point.length >= 2 && point[1] != null)
    .map(([ts, price]) => {
      // SCP prices in API are in cents; chart might be in dollars or cents
      const priceValue = price > 10000 ? price / 100 : price;
      const date = new Date(ts);
      return {
        date: date.toISOString().split("T")[0],
        price: Math.round(priceValue * 100) / 100,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Map a Highcharts series name to a grade key
 */
function mapSeriesName(name) {
  const lower = name.toLowerCase().trim();

  // Direct map from SCP keys
  if (SCP_GRADE_MAP[lower]) return SCP_GRADE_MAP[lower];

  // Name-based matching
  if (lower.includes("ungraded") || lower.includes("raw") || lower === "loose")
    return { label: "Ungraded", grade: "ungraded" };
  if (lower.includes("psa 10") || lower.includes("gem mint"))
    return { label: "PSA 10", grade: "10" };
  if (lower.includes("bgs 10") || lower.includes("pristine"))
    return { label: "BGS 10", grade: "bgs_10" };
  if (lower.includes("sgc 10"))
    return { label: "SGC 10", grade: "sgc_10" };
  if (lower.includes("cgc 10"))
    return { label: "CGC 10", grade: "cgc_10" };
  if (lower.includes("9.5") || lower.includes("gem"))
    return { label: "Grade 9.5", grade: "9.5" };
  if (lower.includes("grade 9") || lower === "9" || lower.includes("mint"))
    return { label: "Grade 9", grade: "9" };
  if (lower.includes("grade 8") || lower === "8")
    return { label: "Grade 8", grade: "8" };
  if (lower.includes("grade 7") || lower === "7")
    return { label: "Grade 7", grade: "7" };

  return { label: name, grade: lower.replace(/\s+/g, "_") };
}

/* ── Main ── */
async function main() {
  console.log("🏷️  SportsCardsPro Historical Data Fetcher (Puppeteer)");
  console.log("=".repeat(60));

  // Launch browser once, reuse for both cards
  console.log("🚀 Launching headless Chrome...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const result = {
    _meta: {
      description:
        "Historical price data from SportsCardsPro for 2018 Topps Update RC cards",
      source: "sportscardspro.com",
      fetchedAt: new Date().toISOString(),
      grades: {
        ungraded: "Ungraded / Raw card",
        "7": "Grade 7",
        "8": "Grade 8",
        "9": "PSA / BGS Grade 9",
        "9.5": "BGS Grade 9.5",
        "10": "PSA 10 (Gem Mint)",
      },
    },
  };

  for (const card of CARDS) {
    console.log(`\n📦 ${card.name} — ${card.cardTitle}`);
    console.log("-".repeat(50));

    // 1. Fetch current prices from API
    const apiData = await fetchCurrentPrices(card.productId);
    if (apiData) {
      console.log(`  ✅ API current prices:`);
      console.log(`     Ungraded: $${(apiData["loose-price"] || 0) / 100}`);
      console.log(`     Grade 9:  $${(apiData["cib-price"] || 0) / 100}`);
      console.log(`     PSA 10:   $${(apiData["new-price"] || 0) / 100}`);
    }

    await sleep(1500);

    // 2. Fetch chart data via Puppeteer
    const chartData = await fetchChartDataWithPuppeteer(browser, card.slug);

    const cardResult = {
      name: card.name,
      cardTitle: card.cardTitle,
      productId: card.productId,
      currentPrices: apiData
        ? {
            ungraded: (apiData["loose-price"] || 0) / 100,
            grade_9: (apiData["cib-price"] || 0) / 100,
            psa_10: (apiData["new-price"] || 0) / 100,
          }
        : null,
      history: {},
      rawChartKeys: Object.keys(chartData || {}),
    };

    // Process chart data into structured history
    if (chartData && Object.keys(chartData).length > 0) {
      for (const [key, data] of Object.entries(chartData)) {
        if (!Array.isArray(data)) continue;
        const normalized = normalizeChartSeries(data);
        if (normalized.length > 0) {
          const gradeInfo = mapSeriesName(key);
          cardResult.history[gradeInfo.grade] = {
            label: gradeInfo.label,
            dataPoints: normalized.length,
            firstDate: normalized[0].date,
            lastDate: normalized[normalized.length - 1].date,
            data: normalized,
          };
          console.log(
            `  📊 ${gradeInfo.label}: ${normalized.length} data points (${normalized[0].date} → ${normalized[normalized.length - 1].date})`
          );
        }
      }
    }

    if (Object.keys(cardResult.history).length === 0) {
      console.log(`  ⚠️  No historical chart data extracted.`);
      console.log(`  ℹ️  Chart keys found: ${cardResult.rawChartKeys.join(", ") || "none"}`);
    }

    result[card.key] = cardResult;
    await sleep(2000);
  }

  await browser.close();
  console.log("🛑 Browser closed.");

  // Save results
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2));
  fs.writeFileSync(PUBLIC_PATH, JSON.stringify(result, null, 2));

  console.log(`\n✅ Saved to ${DATA_PATH}`);
  console.log(`✅ Saved to ${PUBLIC_PATH}`);

  // Summary
  for (const card of CARDS) {
    const c = result[card.key];
    const histKeys = Object.keys(c.history || {});
    console.log(`\n${card.name}: ${histKeys.length} grade series`);
    for (const k of histKeys) {
      const h = c.history[k];
      console.log(`  ${h.label}: ${h.dataPoints} points`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
