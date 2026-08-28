#!/usr/bin/env node
/**
 * Post-deploy chunk verifier.
 *
 * Walks the built module graph starting at index.html and verifies every
 * referenced /assets/*.js chunk actually exists and is real JavaScript
 * (not an HTML 404 fallback). Fails fast with a list of missing chunks.
 *
 * Usage:
 *   node scripts/verify-chunks.mjs                          # local dist/ check
 *   node scripts/verify-chunks.mjs https://example.com       # remote check
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

const target = process.argv[2];
const remote = Boolean(target);
const baseUrl = remote ? target.replace(/\/+$/, "") : null;

function fail(reason, hint) {
  console.error(`\n${RED}${BOLD}✗ Chunk verification failed:${RESET} ${reason}`);
  if (hint) console.error(`\n${YELLOW}${BOLD}Fix:${RESET} ${hint}`);
  console.error("");
  process.exit(1);
}

/** Extract /assets/*.js references from HTML or JS source. */
function extractChunkPaths(source) {
  const found = new Set();
  const re = /["'`(]((?:\.{0,2}\/)?assets\/[A-Za-z0-9._-]+\.js)["'`)]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    found.add("/" + m[1].replace(/^(?:\.{0,2}\/)+/, ""));
  }
  return [...found];
}

function looksLikeHtml(text) {
  return /^\s*(<!doctype html|<html)/i.test(text);
}

async function readLocal(path) {
  const file = join(DIST, path.replace(/^\//, ""));
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8");
}

async function readRemote(path) {
  const url = `${baseUrl}${path}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    return { error: `request failed (${e.message})` };
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const text = await res.text();
  if (path.endsWith(".js") && looksLikeHtml(text)) {
    return { error: "served HTML instead of JavaScript (missing chunk)" };
  }
  return { text };
}

async function load(path) {
  if (remote) return readRemote(path);
  const text = await readLocal(path);
  if (text === null) return { error: "file not found in dist/" };
  if (path.endsWith(".js") && looksLikeHtml(text)) {
    return { error: "not JavaScript" };
  }
  return { text };
}

async function main() {
  if (!remote && !existsSync(DIST)) {
    fail("dist/ not found.", `${BOLD}npm run build${RESET} before verifying chunks.`);
  }

  const entryHtml = await load("/index.html");
  if (entryHtml.error) fail(`could not read index.html — ${entryHtml.error}`);

  const queue = extractChunkPaths(entryHtml.text);
  if (queue.length === 0) {
    fail(
      "no /assets/*.js references found in index.html.",
      "Check that the build completed and produced hashed assets.",
    );
  }

  const seen = new Set(queue);
  const missing = [];
  let verified = 0;

  async function process(path) {
    const result = await load(path);
    if (result.error) {
      missing.push(`${path} — ${result.error}`);
      return;
    }
    verified += 1;
    for (const next of extractChunkPaths(result.text)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(process));
  }

  if (missing.length > 0) {
    fail(
      `${missing.length} chunk(s) unreachable:\n  - ${missing.join("\n  - ")}`,
      remote
        ? "Re-publish the site so every hashed chunk is uploaded."
        : `${BOLD}rm -rf dist && npm run build${RESET}`,
    );
  }

  console.log(
    `${GREEN}✓ Chunk verification OK${RESET} ${DIM}(${verified} chunks reachable${remote ? ` at ${baseUrl}` : " in dist/"})${RESET}`,
  );
}

main().catch((e) => fail(e.message));
