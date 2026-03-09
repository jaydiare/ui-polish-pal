// scripts/fetch-scp-history.js
// One-time script: Fetch 5-year historical price data from SportsCardsPro
// for Acuña #US250 and Torres #US200 rookie cards.
//
// Uses the SportsCardsPro API (/api/product) for current prices, and scrapes
// the product page HTML to extract Highcharts chart data for historical prices.
//
// Requires: SPORTSCARDSPRO secret (API token)
// Output: data/scp-history.json, public/data/scp-history.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "..", "data", "scp-history.json");
const PUBLIC_PATH = path.join(__dirname, "..", "public", "data", "scp-history.json");

const API_TOKEN = process.env.SPORTSCARDSPRO;
if (!API_TOKEN) {
  console.error("❌ SPORTSCARDSPRO secret not set. Set it as an environment variable.");
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

// Grade key mapping from SportsCardsPro API/chart fields
// loose-price = Ungraded
// cib-price = Grade 7 (or Grade 9 for sports cards)
// new-price = Grade 8 (or PSA 10 for sports cards)
// graded-price = Grade 9
// box-only-price = Grade 9.5
// manual-only-price = PSA 10
const CONDITION_MAP = {
  used: "ungraded",
  loose: "ungraded",
  cib: "grade_9",      // For sports cards, cib = Grade 9
  new: "psa_10",        // For sports cards, new = PSA 10 (Grade 8 for other categories)
  graded: "grade_9",
  boxonly: "grade_9.5",
  manualonly: "psa_10",
};

// More accurate mapping based on what we see on the page:
// Ungraded, Grade 7, Grade 8, Grade 9, Grade 9.5, PSA 10
const SCP_GRADE_MAP = {
  loose: { label: "Ungraded", grade: "ungraded" },
  cib: { label: "Grade 9", grade: "9" },
  new: { label: "Grade 8", grade: "8" },
  graded: { label: "Grade 9", grade: "9" },
  boxonly: { label: "Grade 9.5", grade: "9.5" },
  manualonly: { label: "PSA 10", grade: "10" },
  // Additional keys from Highcharts series
  "condition-17": { label: "CGC 10", grade: "cgc_10" },
  "condition-18": { label: "SGC 10", grade: "sgc_10" },
  bgs10: { label: "BGS 10", grade: "bgs_10" },
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

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
 * Fetch the product page HTML and extract Highcharts chart data
 */
async function fetchChartData(slug) {
  const url = `${BASE_URL}/${slug}`;
  console.log(`  🌐 Fetching page: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    console.error(`  ❌ Page fetch error: ${res.status}`);
    return null;
  }
  const html = await res.text();
  console.log(`  📄 HTML: ${html.length} chars`);

  // Extract chart data from inline scripts
  // Highcharts data is typically embedded as JavaScript arrays in the page
  // Look for patterns like: series: [{data: [[timestamp, price], ...]}]
  // or variable assignments with price data arrays

  const chartData = {};

  // Pattern 1: Look for Highcharts series data
  // The data is typically in format: [[timestamp_ms, price], [timestamp_ms, price], ...]
  const seriesPatterns = [
    // Match data arrays with timestamps
    /data:\s*\[\s*\[\s*Date\.UTC\([^)]+\)\s*,\s*[\d.]+\s*\]/g,
    // Match pre-computed arrays
    /\[\s*(?:\[\s*\d{13}\s*,\s*[\d.]+\s*\]\s*,?\s*)+\]/g,
  ];

  // Pattern 2: Look for variable with "price" or "chart" data
  // Common patterns in PriceCharting pages
  const varPatterns = [
    /var\s+(\w*(?:chart|price|data)\w*)\s*=\s*(\{[^;]*\}|\[[^;]*\]);/gi,
    /var\s+(\w*history\w*)\s*=\s*(\{[^;]*\}|\[[^;]*\]);/gi,
  ];

  for (const pattern of varPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const varName = match[1];
      console.log(`    Found variable: ${varName}`);
      try {
        // Try to parse as JSON (replace single quotes, handle JS-style)
        let jsStr = match[2]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*}/g, "}")
          .replace(/,\s*\]/g, "]");
        const parsed = JSON.parse(jsStr);
        chartData[varName] = parsed;
      } catch {
        console.log(`    (Could not parse ${varName} as JSON)`);
      }
    }
  }

  // Pattern 3: Look for the specific Highcharts series configuration
  // PriceCharting typically uses: {name: "Ungraded", data: [[ts, price], ...]}
  const seriesBlockRegex = /series\s*:\s*\[([\s\S]*?)\]\s*(?:,|\})/g;
  let seriesMatch = seriesBlockRegex.exec(html);
  if (seriesMatch) {
    console.log(`    Found Highcharts series block`);
  }

  // Pattern 4: Most reliable — look for the specific price data arrays
  // PriceCharting embeds data as: chart_data["loose"] = [[ts, price], ...]
  // or: vgpc.chart.data.loose = [[ts, price], ...]
  const dataArrayRegex = /(?:chart_data|vgpc\.chart\.data|price_data)\s*(?:\[["'](\w+)["']\]|\.(\w+))\s*=\s*(\[\s*\[[\s\S]*?\]\s*\]);/g;
  let dataMatch;
  while ((dataMatch = dataArrayRegex.exec(html)) !== null) {
    const key = dataMatch[1] || dataMatch[2];
    console.log(`    Found data array: ${key}`);
    try {
      const arr = JSON.parse(dataMatch[3]);
      chartData[key] = arr;
    } catch {
      console.log(`    (Could not parse ${key} array)`);
    }
  }

  // Pattern 5: Look for inline JSON data in data attributes
  const dataAttrRegex = /data-chart-data=["'](\{[^"']*\})["']/g;
  let attrMatch;
  while ((attrMatch = dataAttrRegex.exec(html)) !== null) {
    console.log(`    Found data-chart-data attribute`);
    try {
      const parsed = JSON.parse(attrMatch[1]);
      Object.assign(chartData, parsed);
    } catch {
      // ignore
    }
  }

  // Pattern 6: Raw timestamp-price arrays anywhere in script tags
  // Extract all script tag contents and look for arrays
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  const allScripts = [];
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    allScripts.push(scriptMatch[1]);
  }

  for (const script of allScripts) {
    // Skip external scripts and analytics
    if (script.length < 100 || script.includes("google-analytics") || script.includes("gtag")) continue;

    // Look for Highcharts-style data definitions
    // Pattern: {name: "Ungraded", ... data: [[1234567890000, 25.50], ...]}
    const nameDataRegex = /name\s*:\s*["']([^"']+)["'][^}]*?data\s*:\s*(\[\s*\[[\s\S]*?\]\s*\])/g;
    let ndMatch;
    while ((ndMatch = nameDataRegex.exec(script)) !== null) {
      const seriesName = ndMatch[1];
      console.log(`    Found Highcharts series: "${seriesName}"`);
      try {
        const arr = JSON.parse(ndMatch[2]);
        chartData[seriesName] = arr;
      } catch {
        // Try eval-safe approach for Date.UTC() calls
        const dateUtcStr = ndMatch[2];
        const converted = convertDateUtcArrays(dateUtcStr);
        if (converted) {
          chartData[seriesName] = converted;
        } else {
          console.log(`    (Could not parse "${seriesName}" data)`);
        }
      }
    }

    // Also look for: .setData([[ts, price], ...]) or addSeries({data: [...]})
    const setDataRegex = /\.(?:setData|addPoint)\s*\(\s*(\[\s*\[[\s\S]*?\]\s*\])/g;
    let sdMatch;
    while ((sdMatch = setDataRegex.exec(script)) !== null) {
      console.log(`    Found setData/addPoint call`);
      try {
        chartData["_setData"] = JSON.parse(sdMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  // If no structured data found, try a broader extraction
  if (Object.keys(chartData).length === 0) {
    console.log(`    ⚠️  No structured chart data found, trying broader extraction...`);
    
    for (const script of allScripts) {
      if (script.length < 200) continue;
      
      // Look for any large arrays of [number, number] pairs (timestamp, price)
      const bigArrayRegex = /\[\s*\[\s*\d{10,13}\s*,\s*\d+(?:\.\d+)?\s*\](?:\s*,\s*\[\s*\d{10,13}\s*,\s*\d+(?:\.\d+)?\s*\]){5,}\s*\]/g;
      let baMatch;
      let idx = 0;
      while ((baMatch = bigArrayRegex.exec(script)) !== null) {
        console.log(`    Found large timestamp-price array (idx ${idx})`);
        try {
          chartData[`series_${idx}`] = JSON.parse(baMatch[0]);
          idx++;
        } catch {
          // ignore
        }
      }
    }
  }

  return chartData;
}

/**
 * Convert Date.UTC() calls to timestamps
 */
function convertDateUtcArrays(str) {
  try {
    // Replace Date.UTC(y,m,d) with actual timestamp
    const converted = str.replace(/Date\.UTC\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g, (_, y, m, d) => {
      return String(Date.UTC(parseInt(y), parseInt(m), parseInt(d)));
    });
    return JSON.parse(converted);
  } catch {
    return null;
  }
}

/**
 * Convert chart data timestamps to structured history
 * Input: [[timestamp_ms, price_in_cents_or_dollars], ...]
 * Output: [{date: "YYYY-MM-DD", price: dollars}, ...]
 */
function normalizeChartSeries(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  return rawData
    .filter((point) => Array.isArray(point) && point.length >= 2 && point[1] != null)
    .map(([ts, price]) => {
      // SportsCardsPro prices in API are in cents; chart might be in dollars
      // If all prices > 100 and we expect dollar values < $300, they're in cents
      const priceValue = price > 10000 ? price / 100 : price;
      const date = new Date(ts);
      return {
        date: date.toISOString().split("T")[0],
        price: Math.round(priceValue * 100) / 100,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ── Main ── */
async function main() {
  console.log("🏷️  SportsCardsPro Historical Data Fetcher");
  console.log("=".repeat(60));

  const result = {
    _meta: {
      description: "Historical price data from SportsCardsPro for 2018 Topps Update RC cards",
      source: "sportscardspro.com",
      fetchedAt: new Date().toISOString(),
      grades: {
        ungraded: "Ungraded / Raw card",
        "9": "PSA / BGS Grade 9",
        "9.5": "BGS Grade 9.5",
        "10": "PSA 10 (Gem Mint)",
        "8": "Grade 8",
        "7": "Grade 7",
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
      if (apiData["graded-price"]) console.log(`     Graded:   $${apiData["graded-price"] / 100}`);
      if (apiData["box-only-price"]) console.log(`     Grade 9.5: $${apiData["box-only-price"] / 100}`);
      if (apiData["manual-only-price"]) console.log(`     PSA 10 (manual): $${apiData["manual-only-price"] / 100}`);
    }

    await sleep(1500);

    // 2. Fetch chart data from page
    const chartData = await fetchChartData(card.slug);

    const cardResult = {
      name: card.name,
      cardTitle: card.cardTitle,
      productId: card.productId,
      currentPrices: apiData
        ? {
            ungraded: (apiData["loose-price"] || 0) / 100,
            grade_7: (apiData["cib-price"] || 0) / 100,
            grade_8: (apiData["new-price"] || 0) / 100,
            grade_9: (apiData["graded-price"] || 0) / 100,
            grade_9_5: (apiData["box-only-price"] || 0) / 100,
            psa_10: (apiData["manual-only-price"] || 0) / 100,
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
          // Map the key to a grade label
          const gradeInfo = SCP_GRADE_MAP[key.toLowerCase()] || { label: key, grade: key.toLowerCase() };
          cardResult.history[gradeInfo.grade] = {
            label: gradeInfo.label,
            dataPoints: normalized.length,
            firstDate: normalized[0].date,
            lastDate: normalized[normalized.length - 1].date,
            data: normalized,
          };
          console.log(`  📊 ${gradeInfo.label}: ${normalized.length} data points (${normalized[0].date} → ${normalized[normalized.length - 1].date})`);
        }
      }
    }

    if (Object.keys(cardResult.history).length === 0) {
      console.log(`  ⚠️  No historical chart data extracted from page.`);
      console.log(`  ℹ️  Chart data keys found: ${cardResult.rawChartKeys.join(", ") || "none"}`);
      console.log(`  ℹ️  The chart may use dynamic loading. Try running with a headless browser.`);
    }

    result[card.key] = cardResult;
    await sleep(2000);
  }

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
