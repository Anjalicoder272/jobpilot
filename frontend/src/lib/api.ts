// Cookies carry the JWT, so JavaScript never touches tokens.

export class ApiError extends Error {
  constructor(public status: number, public data: Record<string, unknown>) {
    super(firstMessage(data) ?? defaultMessage(status));
  }

  /** Field errors from DRF, e.g. { email: "Already exists" }, for showing next to inputs. */
  get fields(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.data ?? {})) {
      if (key === "detail" || key === "non_field_errors") continue;
      const msg = Array.isArray(value) ? value[0] : value;
      if (typeof msg === "string") out[key] = msg;
    }
    return out;
  }
}

function defaultMessage(status: number) {
  if (status === 0) return "You seem to be offline. Check your connection and try again.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status === 413) return "That file or text is too large.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Request failed. Please try again.";
}

function firstMessage(data: Record<string, unknown>): string | undefined {
  for (const value of Object.values(data ?? {})) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
}

async function send(path: string, init: RequestInit) {
  const isForm = init.body instanceof FormData;
  try {
    return await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "JobPilot",
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, {});
  }
}

// Endpoints that must never trigger a token refresh (they are how you get tokens).
const NO_REFRESH = ["/api/auth/login/", "/api/auth/signup/", "/api/auth/refresh/", "/api/auth/logout/"];

// Several requests can expire at once; they all wait for one shared refresh.
let refreshing: Promise<boolean> | null = null;
function refreshSession() {
  refreshing ??= send("/api/auth/refresh/", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);

  if (res.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) res = await send(path, init);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const post = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined, signal });

export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const del = (path: string) => api<void>(path, { method: "DELETE" });

export const upload = <T>(path: string, form: FormData) => api<T>(path, { method: "POST", body: form });

export const errorMessage = (error: unknown, fallback = "Something went wrong. Please try again.") =>
  error instanceof Error && error.message ? error.message : fallback;
