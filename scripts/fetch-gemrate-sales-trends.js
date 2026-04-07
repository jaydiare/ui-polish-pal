#!/usr/bin/env node
// scripts/fetch-gemrate-sales-trends.js
//
// Monthly scraper: loads gemrate.com/sales-trends, extracts AG Grid data,
// filters for Venezuelan athletes (data/athletes.json), and saves
// sales volume + trend data to gemrate-sales-trends.json.
//
// Requires: puppeteer
// Output: data/gemrate-sales-trends.json, public/data/gemrate-sales-trends.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const PUBLIC_DIR = path.join(__dirname, "..", "public", "data");
const DATA_PATH = path.join(DATA_DIR, "gemrate-sales-trends.json");
const PUBLIC_PATH = path.join(PUBLIC_DIR, "gemrate-sales-trends.json");
const ATHLETES_PATH = path.join(DATA_DIR, "athletes.json");

const URL = "https://www.gemrate.com/sales-trends";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Normalize name for fuzzy matching
function normName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

async function main() {
  // Load Venezuelan athlete roster
  const athletesRaw = JSON.parse(fs.readFileSync(ATHLETES_PATH, "utf-8"));
  const rosterSet = new Set();
  const rosterMap = {};
  for (const a of athletesRaw) {
    const key = normName(a.name);
    rosterSet.add(key);
    rosterMap[key] = { name: a.name, sport: a.sport };
  }
  console.log(`📋 Loaded ${rosterSet.size} athletes from roster`);

  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1440, height: 900 });

    console.log("🌐 Navigating to gemrate.com/sales-trends...");
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for AG Grid to render
    console.log("⏳ Waiting for AG Grid...");
    await page.waitForSelector(".ag-root-wrapper", { timeout: 30000 });
    // Give AG Grid extra time to populate rows
    await new Promise((r) => setTimeout(r, 5000));

    // Extract all row data from AG Grid
    console.log("📊 Extracting grid data...");
    const allRows = await page.evaluate(() => {
      // AG Grid stores data in the grid element's __agComponent or gridOptions
      const gridEl = document.querySelector("#sales_grid");
      if (!gridEl) return [];

      // Try to access AG Grid API via multiple methods
      let api = null;

      // Method 1: AG Grid 28+ stores on __agGridInstance
      if (gridEl.__agGridInstance) {
        api = gridEl.__agGridInstance.api;
      }

      // Method 2: Check for gridOptions on the element
      if (!api && gridEl.gridOptions) {
        api = gridEl.gridOptions.api;
      }

      // Method 3: Look for AG Grid component wrapper
      if (!api) {
        const agRoot = gridEl.querySelector(".ag-root");
        if (agRoot && agRoot.__agComponent) {
          api = agRoot.__agComponent.gridApi;
        }
      }

      // Method 4: Try global agGrid variable
      if (!api && window.gridApi) {
        api = window.gridApi;
      }

      // Method 5: Search for api on common global patterns
      if (!api && window.gridOptions) {
        api = window.gridOptions.api;
      }

      if (api) {
        const rows = [];
        api.forEachNode((node) => {
          if (node.data) rows.push(node.data);
        });
        return rows;
      }

      // Fallback: DOM scraping from visible + virtual rows
      const rowEls = gridEl.querySelectorAll(".ag-row");
      const rows = [];
      for (const row of rowEls) {
        const cells = row.querySelectorAll(".ag-cell");
        if (cells.length < 5) continue;
        const getText = (el) => (el ? el.textContent.trim() : "");
        rows.push({
          category: getText(cells[0]),
          player: getText(cells[1]),
        });
      }
      return rows;
    });

    console.log(`  Found ${allRows.length} total rows in grid`);

    // If AG Grid API was accessible, rows have structured data
    // If DOM fallback, rows have limited data
    // Try to also scroll the grid to load all rows (virtual scrolling)
    if (allRows.length < 100) {
      console.log("⚠ Few rows found. Attempting scroll-based extraction...");

      // Scroll through the grid to load all virtualized rows
      const extractedRows = await page.evaluate(async () => {
        const viewport = document.querySelector(".ag-body-viewport");
        if (!viewport) return [];

        const rows = new Map();
        const totalHeight = viewport.scrollHeight;
        const stepSize = 500;

        for (let pos = 0; pos < totalHeight; pos += stepSize) {
          viewport.scrollTop = pos;
          await new Promise((r) => setTimeout(r, 200));

          const rowEls = document.querySelectorAll(".ag-row");
          for (const row of rowEls) {
            const rowIdx = row.getAttribute("row-index");
            if (rows.has(rowIdx)) continue;

            const pinnedCells = row.closest(".ag-pinned-left-cols-container")
              ? Array.from(row.querySelectorAll(".ag-cell"))
              : [];
            const centerRow = document.querySelector(
              `.ag-center-cols-container .ag-row[row-index="${rowIdx}"]`
            );
            const centerCells = centerRow
              ? Array.from(centerRow.querySelectorAll(".ag-cell"))
              : [];

            // Build data from pinned (category, player) + center cells
            const allCells = [...pinnedCells, ...centerCells];
            if (allCells.length < 4) continue;

            const getText = (el) => (el ? el.textContent.trim() : "");
            const getNum = (el) => {
              const t = getText(el).replace(/[$,%+]/g, "").replace(/,/g, "");
              const n = parseFloat(t);
              return isNaN(n) ? null : n;
            };

            // Map col-ids to values
            const cellMap = {};
            for (const cell of allCells) {
              const colId = cell.getAttribute("col-id");
              if (colId) {
                cellMap[colId] = getText(cell);
              }
            }

            rows.set(rowIdx, cellMap);
          }
        }

        return Array.from(rows.values());
      });

      if (extractedRows.length > allRows.length) {
        console.log(`  Scroll extraction found ${extractedRows.length} rows`);
        allRows.length = 0;
        allRows.push(...extractedRows);
      }
    }

    // Match against Venezuelan roster
    const matched = [];
    for (const row of allRows) {
      const playerName = row.player || row.Player || "";
      const norm = normName(playerName);
      if (!norm || !rosterSet.has(norm)) continue;

      const rosterEntry = rosterMap[norm];
      const entry = {
        name: rosterEntry.name,
        sport: rosterEntry.sport,
        category: row.category || row.Category || "",
        mostGradedYear: row.most_graded || row.mostGradedYear || null,
        firstGradedYear: row.first_graded || row.firstGradedYear || null,
      };

      // Extract monthly volume data (keys like jan_2026, feb_2026, etc.)
      const months = {};
      for (const [key, val] of Object.entries(row)) {
        // Match month keys: jan_2026, feb_2026, etc.
        const monthMatch = key.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)_(\d{4})$/i);
        if (monthMatch) {
          const numVal = parseFloat(String(val).replace(/[$,%+]/g, "").replace(/,/g, ""));
          months[key] = isNaN(numVal) ? null : numVal;
        }
        // Match change keys
        const changeMatch = key.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)_(\d{4})_(change|pct)$/i);
        if (changeMatch) {
          const numVal = parseFloat(String(val).replace(/[$,%+]/g, "").replace(/,/g, ""));
          months[key] = isNaN(numVal) ? null : numVal;
        }
      }

      // Also try numeric-looking keys
      if (row.ytd_2026 !== undefined) entry.ytd2026 = row.ytd_2026;
      if (row.ytd_2025 !== undefined) entry.ytd2025 = row.ytd_2025;

      entry.monthlyVolumes = months;
      matched.push(entry);
    }

    console.log(`✅ Matched ${matched.length} Venezuelan athletes`);

    const output = {
      _meta: {
        updatedAt: new Date().toISOString(),
        athleteCount: matched.length,
        source: "gemrate.com/sales-trends",
        description: "Monthly sales volume trends for Venezuelan athletes",
      },
      athletes: matched,
    };

    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
    fs.writeFileSync(PUBLIC_PATH, JSON.stringify(output, null, 2));

    console.log(`📁 Saved to ${DATA_PATH}`);
    console.log(`📁 Saved to ${PUBLIC_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
