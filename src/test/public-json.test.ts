import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicJson } from "@/lib/public-json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPublicJson", () => {
  it("shares one concurrent request and leaves caching to the browser", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    const url = "https://example.com/shared-history.json";
    const first = fetchPublicJson<{ value: number }>(url);
    const second = fetchPublicJson<{ value: number }>(url);

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(url);

    resolveFetch({ ok: true, json: async () => ({ value: 42 }) } as Response);
    await expect(first).resolves.toEqual({ value: 42 });
  });

  it("allows later requests to revalidate instead of caching data forever", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fresh: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const url = "https://example.com/revalidated-history.json";
    await fetchPublicJson(url);
    await fetchPublicJson(url);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
