const TOKEN_KEY = "accessToken";

export interface ApiResult<T = any> {
  status: "success" | "fail" | "error";
  message: string;
  data?: T;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  auth?: boolean;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function putAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function buildUrl(
  path: string,
  query: Record<string, unknown> = {},
  baseUrl: string = DELCOM_BASEURL
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.append(key, String(value));
  });
  const queryString = params.toString();
  const url = `${baseUrl}${path}`;
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Wrapper fetch ke Delcom REST API.
 * Selalu mengembalikan objek hasil (tidak pernah throw) agar mudah ditangani store.
 */
export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const { method = "GET", query, body, auth = true } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAccessToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const init: RequestInit = { method, headers, body: payload };

  try {
    let response: Response;
    try {
      response = await fetch(buildUrl(path, query), init);
    } catch {
      // Jalur utama gagal total (diblokir CORS / jaringan): ulangi lewat proxy same-origin.
      response = await fetch(buildUrl(path, query, DELCOM_PROXY_BASEURL), init);
    }
    return (await response.json()) as ApiResult<T>;
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }
}
