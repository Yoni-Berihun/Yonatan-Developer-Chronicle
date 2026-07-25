export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-keyed messages, ready to render next to the offending input. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) map[detail.field] = detail.message;
    return map;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * All calls are same-origin: Vite proxies /api in development; in production
 * Express serves the React build and the API from one host. That keeps the
 * session cookie first-party (Safari/Firefox block third-party cookies).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: "same-origin",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed with status ${response.status}`;

    const details =
      isJson && typeof payload === "object" && payload && "details" in payload
        ? ((payload as { details?: { field: string; message: string }[] }).details ?? undefined)
        : undefined;

    // Drop a live admin session when the cookie is gone mid-use — but never for
    // the deliberate "am I signed in?" probe on /auth/me or a failed login.
    if (
      response.status === 401 &&
      path !== "/auth/me" &&
      path !== "/auth/login" &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent("yt:session-expired"));
    }

    throw new ApiError(response.status, message, details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
