export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Only http(s) links are rendered as hrefs; anything else (javascript:, data:) is dropped. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

/** A post-login redirect target, accepted only if it is a path on this site. */
export function safeNext(next: string | null | undefined, fallback = "/board"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function relativeDays(date: string) {
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const AVATAR_TINTS = ["#0f766e", "#1d4ed8", "#6d28d9", "#be185d", "#c2410c", "#15803d", "#4338ca", "#0e7490"];

export function companyTint(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function plural(n: number, word: string, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

/** Resolves no sooner than `ms`, so very fast responses still show their loading state instead of flickering. */
export function atLeast<T>(promise: Promise<T>, ms = 500): Promise<T> {
  return Promise.allSettled([promise, new Promise((r) => setTimeout(r, ms))]).then(([result]) =>
    result.status === "fulfilled" ? result.value : Promise.reject(result.reason),
  );
}

export function updatedAgo(date: string | null | undefined) {
  if (!date) return "";
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.round(hours / 24)}d ago`;
}
