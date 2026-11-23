const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetch public JSON with the browser's normal HTTP caching.
 * Concurrent consumers share one network request; settled requests are removed
 * so later visits can still revalidate fresh data with the server.
 */
export function fetchPublicJson<T = unknown>(url: string): Promise<T | null> {
  const pending = inFlightRequests.get(url);
  if (pending) return pending as Promise<T | null>;

  const request = fetch(url)
    .then(async (response): Promise<T | null> => {
      if (!response.ok) return null;
      return (await response.json()) as T;
    })
    .catch(() => null);

  inFlightRequests.set(url, request);
  void request.then(() => {
    if (inFlightRequests.get(url) === request) inFlightRequests.delete(url);
  });

  return request;
}
