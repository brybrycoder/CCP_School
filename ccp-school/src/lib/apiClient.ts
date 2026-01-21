import { getJwtToken } from "./tokenProvider";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getJwtToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const parsed = (await response.json()) as { message?: string };
      if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // Ignore JSON parse errors and use default message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
