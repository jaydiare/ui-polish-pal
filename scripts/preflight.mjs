#!/usr/bin/env node
/**
 * Preflight check — verifies node_modules and required dependencies before `vite` starts.
 *
 * Usage:
 *   node scripts/preflight.mjs           # check only
 *   node scripts/preflight.mjs && vite   # gate the dev server on a clean check
 *
 * Exits 0 on success, 1 with a clear reinstall command on failure.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// Critical packages required to boot the dev server. Add here as the stack evolves.
// `declared: true` -> must appear in package.json AND be installed.
// `declared: false` -> transitive dep; only verify it's present in node_modules.
const CRITICAL = [
  { name: "vite", declared: false },
  { name: "@vitejs/plugin-react-swc", declared: true },
  { name: "react", declared: true },
  { name: "react-dom", declared: true },
  { name: "typescript", declared: true },
  { name: "tailwindcss", declared: true },
  { name: "postcss", declared: true },
  { name: "autoprefixer", declared: true },
];

function fail(reason, hint) {
  console.error(`\n${RED}${BOLD}✗ Preflight failed:${RESET} ${reason}`);
  if (hint) {
    console.error(`\n${YELLOW}${BOLD}Fix:${RESET} ${hint}`);
  }
  console.error(
    `\n${DIM}Run from project root. If issues persist, delete node_modules and the lockfile, then reinstall.${RESET}\n`,
  );
  process.exit(1);
}

const nodeModules = join(ROOT, "node_modules");
if (!existsSync(nodeModules)) {
  fail(
    "node_modules/ is missing.",
    `${BOLD}bun install${RESET}   ${DIM}(or: npm install)${RESET}`,
  );
}

const pkgPath = join(ROOT, "package.json");
if (!existsSync(pkgPath)) {
  fail("package.json not found.", "Are you in the project root?");
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch (e) {
  fail(`Could not parse package.json: ${e.message}`, "Restore package.json from version control.");
}

const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
const missing = [];

for (const name of CRITICAL) {
  if (!declared[name]) {
    missing.push(`${name} (not declared in package.json)`);
    continue;
  }
  if (!existsSync(join(nodeModules, name, "package.json"))) {
    missing.push(`${name} (declared but not installed)`);
  }
}

if (missing.length > 0) {
  fail(
    `Missing critical dependencies:\n  - ${missing.join("\n  - ")}`,
    `${BOLD}bun install${RESET}   ${DIM}(or: rm -rf node_modules && bun install)${RESET}`,
  );
}

console.log(`${GREEN}✓ Preflight OK${RESET} ${DIM}(node_modules + ${CRITICAL.length} critical deps verified)${RESET}`);
