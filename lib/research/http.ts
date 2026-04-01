/** Wrap fetch with clearer errors (DNS/TLS failures show up as "fetch failed" otherwise). */
export async function fetchWithContext(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const cause =
      e instanceof Error && e.cause !== undefined ? ` (cause: ${String(e.cause)})` : "";
    throw new Error(`GET ${url}: ${msg}${cause}`);
  }
}
