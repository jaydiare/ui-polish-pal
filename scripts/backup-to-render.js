/**
 * backup-to-render.js
 * -------------------
 * Weekly backup of critical JSON data files to Render PostgreSQL.
 * Stores each file as a separate row in a `snapshots` table (JSONB).
 *
 * Env: RENDER_DATABASE_URL (Render external connection string)
 *
 * Usage:  node scripts/backup-to-render.js
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DATABASE_URL = process.env.RENDER_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ RENDER_DATABASE_URL is not set");
  process.exit(1);
}

// Files to back up (relative to repo root)
// Dynamically find all JSON files in data/
const DATA_DIR = path.join(ROOT, "data");
const FILES = fs.readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.join("data", f));

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Connected to Render PostgreSQL");

  // Create table if it doesn't exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id        SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
      size_bytes INTEGER,
      data      JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (file_name, snapshot_date)
    );
  `);
  console.log("✅ snapshots table ready");

  let backed = 0;
  let skipped = 0;

  for (const relPath of FILES) {
    const fullPath = path.join(ROOT, relPath);
    const fileName = path.basename(relPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  ${relPath} not found, skipping`);
      skipped++;
      continue;
    }

    const raw = fs.readFileSync(fullPath, "utf-8");
    const sizeBytes = Buffer.byteLength(raw, "utf-8");

    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`⚠️  ${fileName} has invalid JSON (${parseErr.message}), skipping`);
      skipped++;
      continue;
    }

    // Upsert: if same file+date exists, update it
    await client.query(
      `INSERT INTO snapshots (file_name, size_bytes, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (file_name, snapshot_date)
       DO UPDATE SET data = $3, size_bytes = $2, created_at = NOW()`,
      [fileName, sizeBytes, JSON.stringify(json)]
    );

    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    console.log(`  📦 ${fileName} — ${sizeMB} MB`);
    backed++;
  }

  // Report total DB size
  const sizeRes = await client.query(
    `SELECT pg_size_pretty(pg_total_relation_size('snapshots')) AS size`
  );
  console.log(`\n✅ Backed up ${backed} files (${skipped} skipped)`);
  console.log(`📊 Total snapshots table size: ${sizeRes.rows[0].size}`);

  // Show snapshot count
  const countRes = await client.query(
    `SELECT snapshot_date, COUNT(*) as files, 
            pg_size_pretty(SUM(size_bytes)::bigint) as total_size
     FROM snapshots 
     GROUP BY snapshot_date 
     ORDER BY snapshot_date DESC 
     LIMIT 5`
  );
  console.log("\n📅 Recent snapshots:");
  for (const row of countRes.rows) {
    console.log(`   ${row.snapshot_date} — ${row.files} files, ${row.total_size}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("❌ Backup failed:", err.message);
  process.exit(1);
});
