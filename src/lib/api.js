export class ApiError extends Error {
  constructor(message, status, payload = {}) { super(message); this.name = "ApiError"; this.status = status; this.payload = payload; }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const base = import.meta.env.DEV ? "http://localhost:8787" : "";
  const response = await fetch(`${base}${path}`, { ...options, headers, credentials: "include" });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || `Request failed (${response.status})`, response.status, payload);
  return payload;
}

export const jsonBody = (value) => JSON.stringify(value);
