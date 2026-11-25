import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import generatedLookup from "../../data/venezuelan-bios.json";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("biography snapshot fallback", () => {
  it("loads Jesús Luzardo from local data when a valid remote snapshot omits him", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      text: async () => JSON.stringify(url.startsWith("https:")
        ? { players: {}, aliases: {} }
        : generatedLookup),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { useVenezuelanBio } = await import("@/hooks/useVenezuelanBio");
    const { result } = renderHook(() => useVenezuelanBio("Jesus Luzardo", "Baseball", true));
    await waitFor(() => expect(result.current?.birthCity).toBe("Lima"));
    expect(fetchMock).toHaveBeenCalledWith("/data/venezuelan-bios.json");
  });

  it("does not fetch local data when the live snapshot already includes the player", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(generatedLookup) }));
    vi.stubGlobal("fetch", fetchMock);
    const { useVenezuelanBio } = await import("@/hooks/useVenezuelanBio");
    const { result } = renderHook(() => useVenezuelanBio("Jesus Luzardo", "Baseball", true));
    await waitFor(() => expect(result.current?.birthCity).toBe("Lima"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});