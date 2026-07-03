/**
 * backup-to-render.js
 * -------------------
 * Tri-weekly backup of critical JSON data files to Render PostgreSQL.
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

const DATA_DIR = path.join(ROOT, "data");
const FILES = fs.readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.join("data", f));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeClient() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    // Give Render's free tier plenty of time to accept large JSONB writes
    statement_timeout: 120_000,
    query_timeout: 120_000,
    connectionTimeoutMillis: 30_000,
  });
  // Prevent an async 'error' event (e.g. idle TCP reset) from crashing the process
  client.on("error", (err) => {
    console.warn(`⚠️  pg client error (will reconnect): ${err.message}`);
  });
  return client;
}

async function connectWithRetry(attempts = 5) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    const client = makeClient();
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️  connect attempt ${i}/${attempts} failed: ${err.message}`);
      try { await client.end(); } catch {}
      await sleep(2000 * i);
    }
  }
  throw lastErr;
}

async function ensureSchema(client) {
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
}

async function upsertFile(clientRef, fileName, sizeBytes, jsonStr) {
  const sql = `INSERT INTO snapshots (file_name, size_bytes, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (file_name, snapshot_date)
       DO UPDATE SET data = $3, size_bytes = $2, created_at = NOW()`;
  const params = [fileName, sizeBytes, jsonStr];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await clientRef.client.query(sql, params);
      return true;
    } catch (err) {
      console.warn(`⚠️  ${fileName} write attempt ${attempt}/3 failed: ${err.message}`);
      // Reconnect on connection-level errors
      try { await clientRef.client.end(); } catch {}
      await sleep(1500 * attempt);
      clientRef.client = await connectWithRetry();
      await ensureSchema(clientRef.client);
    }
  }
  return false;
}

async function main() {
  const clientRef = { client: await connectWithRetry() };
  console.log("✅ Connected to Render PostgreSQL");

  await ensureSchema(clientRef.client);
  console.log("✅ snapshots table ready");

  let backed = 0;
  let skipped = 0;
  let failed = 0;

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

    const ok = await upsertFile(clientRef, fileName, sizeBytes, JSON.stringify(json));
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    if (ok) {
      console.log(`  📦 ${fileName} — ${sizeMB} MB`);
      backed++;
    } else {
      console.error(`  ❌ ${fileName} — ${sizeMB} MB (failed after retries)`);
      failed++;
    }
  }

  try {
    const sizeRes = await clientRef.client.query(
      `SELECT pg_size_pretty(pg_total_relation_size('snapshots')) AS size`
    );
    console.log(`\n✅ Backed up ${backed} files (${skipped} skipped, ${failed} failed)`);
    console.log(`📊 Total snapshots table size: ${sizeRes.rows[0].size}`);

    const countRes = await clientRef.client.query(
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
  } catch (err) {
    console.warn(`⚠️  summary query failed: ${err.message}`);
  }

  try { await clientRef.client.end(); } catch {}

  // Only hard-fail if nothing at all was backed up
  if (backed === 0) {
    console.error("❌ No files were backed up");
    process.exit(1);
  }
  if (failed > 0) {
    console.warn(`⚠️  Completed with ${failed} failed file(s)`);
  }
}

main().catch((err) => {
  console.error("❌ Backup failed:", err.message);
  process.exit(1);
});
