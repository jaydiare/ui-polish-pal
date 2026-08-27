import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "vzla_chunk_reload_at";

/**
 * Wraps React.lazy so a failed dynamic import (usually a stale chunk left over
 * from a previous deploy) retries once, then forces a single hard reload.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      // one silent retry (transient network blip)
      try {
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        // only reload once per minute to avoid an infinite reload loop
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // keep the promise pending while the page reloads
          return await new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
