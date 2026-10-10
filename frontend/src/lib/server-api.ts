import "server-only";

function apiBase(): string {
  let url = (process.env.API_URL ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  if (!url) return "http://127.0.0.1:8000";
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

/** Public, cacheable reads for server-rendered pages. Returns null instead of throwing, so a slow API never breaks SEO pages. */
export async function serverGet<T>(path: string, revalidate = 120): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
