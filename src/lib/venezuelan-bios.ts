export interface VenezuelanBio {
  name: string;
  bats: string;
  throws: string;
  height: number | null;
  weight: number | null;
  hof: string;
  debut: string;
  last: string;
  birthCity: string;
  birthState: string;
}

export interface VenezuelanBioLookup {
  players: Record<string, VenezuelanBio>;
  aliases: Record<string, string>;
}

export function normalizeBioName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isVenezuelanBioLookup(value: unknown): value is VenezuelanBioLookup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VenezuelanBioLookup>;
  return !!candidate.players && typeof candidate.players === "object"
    && !!candidate.aliases && typeof candidate.aliases === "object";
}

export function findVenezuelanBio(
  lookup: VenezuelanBioLookup | null,
  name: string,
  sport?: string,
): VenezuelanBio | null {
  if (!lookup || sport !== "Baseball") return null;
  const normalized = normalizeBioName(name);
  const withoutSuffix = normalized.replace(/\s+(jr|sr|ii|iii|iv|v)$/, "");
  const id = lookup.aliases[normalized] ?? lookup.aliases[withoutSuffix];
  return id ? lookup.players[id] ?? null : null;
}

export function formatBioDate(value: string, lang: "en" | "es"): string {
  if (!/^\d{8}$/.test(value)) return "—";
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "—";
  return new Intl.DateTimeFormat(lang === "es" ? "es-419" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatBioHeight(inches: number | null): string {
  if (inches == null || !Number.isFinite(inches) || inches <= 0) return "—";
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function formatBioWeight(pounds: number | null): string {
  if (pounds == null || !Number.isFinite(pounds) || pounds <= 0) return "—";
  return `${pounds} lb`;
}
