// Small fetch wrapper. Cookies carry the JWT, so we never touch tokens in JavaScript.

export class ApiError extends Error {
  constructor(public status: number, public data: Record<string, unknown>) {
    super(firstMessage(data) ?? `Request failed (${status})`);
  }
}

// Turn DRF errors like {"email": ["Already exists"]} into one readable message.
function firstMessage(data: Record<string, unknown>): string | undefined {
  for (const value of Object.values(data ?? {})) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
}

async function send(path: string, init: RequestInit) {
  // File uploads (FormData) set their own Content-Type with the multipart boundary.
  const isForm = init.body instanceof FormData;
  return fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
  });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);

  // The access token lasts 30 minutes. If it expired, refresh it once and retry.
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await send("/api/auth/refresh/", { method: "POST" });
    if (refreshed.ok) res = await send(path, init);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const post = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined, signal });

export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const del = (path: string) => api<void>(path, { method: "DELETE" });

export const upload = <T>(path: string, form: FormData) => api<T>(path, { method: "POST", body: form });
