import { ApiNetworkError, ApiUnwrapError, apiErrorFromBody, isApiResponseEnvelope } from "./errors";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | (string | number | boolean)[];

export interface RequestOptions {
  method?: HttpMethod;
  /** Path relative to the API root, e.g. "/api/v1/projects". */
  path: string;
  query?: Record<string, QueryValue>;
  /** Serialised as a JSON body. Omitted entirely when undefined. */
  body?: unknown;
  /** Bearer token; omitted when null/undefined. */
  token?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** A bound transport. Endpoint modules are written against this alone. */
export type Requester = <T>(options: RequestOptions) => Promise<T>;

export const DEFAULT_BASE_URL = "http://localhost:8000";

/**
 * Resolve the API origin.
 *
 * Server-side calls use API_BASE_URL. NEXT_PUBLIC_API_BASE_URL is the fallback
 * so the value can be shared if you ever front the API with a CORS-enabled
 * gateway; today the API sends no CORS headers, so browsers cannot call it
 * directly and every request goes through the Next.js server.
 */
export function resolveBaseUrl(explicit?: string): string {
  const value =
    explicit ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_BASE_URL;
  return value.replace(/\/+$/, "");
}

/** Serialise query params, dropping null/undefined and expanding arrays. */
export function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        params.append(key, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs === "" ? "" : `?${qs}`;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined;
  }
  const text = await response.text();
  if (text === "") return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return text;
  try {
    return JSON.parse(text);
  } catch {
    // A 500 from FastAPI streams a plain-text traceback despite the status
    // line; keep it as the message rather than throwing a parse error.
    return text;
  }
}

export interface CreateRequesterOptions {
  baseUrl?: string;
  /** Supplies the bearer token per-request; may be async. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Injected for tests, or to wrap fetch with caching/instrumentation. */
  fetchImpl?: typeof fetch;
  /** Extra headers merged into every request. */
  defaultHeaders?: Record<string, string>;
  /**
   * Called after each successful response. The envelope's `request_id` is the
   * backend's trace id — logging it here makes client-side reports traceable
   * without threading it through every return type.
   */
  onResponse?: (info: {
    method: HttpMethod;
    path: string;
    status: number;
    requestId: string | null;
  }) => void;
}

/**
 * Build a `Requester` bound to a base URL and token source.
 *
 * Responses with no body (204) resolve to `undefined`; every non-2xx status
 * throws `ApiError`, and transport failures throw `ApiNetworkError`.
 */
export function createRequester(options: CreateRequesterOptions = {}): Requester {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const doFetch = options.fetchImpl ?? fetch;

  return async function request<T>({
    method = "GET",
    path,
    query,
    body,
    token,
    signal,
    headers,
  }: RequestOptions): Promise<T> {
    const url = `${baseUrl}${path}${buildQueryString(query)}`;

    const resolvedToken = token !== undefined ? token : await options.getToken?.();

    const finalHeaders: Record<string, string> = {
      accept: "application/json",
      ...options.defaultHeaders,
      ...headers,
    };
    if (resolvedToken) {
      finalHeaders.authorization = `Bearer ${resolvedToken}`;
    }
    if (body !== undefined) {
      finalHeaders["content-type"] = "application/json";
    }

    let response: Response;
    try {
      response = await doFetch(url, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        // These are per-user, auth-scoped reads; caching them across requests
        // would leak one user's data into another's render.
        cache: "no-store",
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new ApiNetworkError(
        `Could not reach the API at ${baseUrl}. Is the backend running?`,
        { cause },
      );
    }

    const parsed = await parseBody(response);

    if (!response.ok) {
      throw apiErrorFromBody(
        response.status,
        parsed,
        `${method} ${path} failed with ${response.status}`,
      );
    }

    // Every endpoint answers with the same envelope, so unwrap it and hand
    // callers the payload. Endpoints that return nothing (deletes, logout)
    // answer 200 with `data: null`.
    //
    // A genuinely empty 2xx body has nothing to unwrap; treat it as no data
    // rather than a contract violation.
    if (parsed === undefined) return undefined as T;

    if (!isApiResponseEnvelope(parsed)) {
      throw new ApiUnwrapError(
        `${method} ${path} returned ${response.status} but the body was not a response envelope.`,
        parsed,
      );
    }

    const requestId =
      typeof parsed.request_id === "string" ? parsed.request_id : null;
    options.onResponse?.({ method, path, status: response.status, requestId });

    // `ok: false` with a 2xx shouldn't happen, but trust the envelope over the
    // status line rather than handing back a null payload as if it succeeded.
    if (parsed.ok === false) {
      throw apiErrorFromBody(
        response.status,
        parsed,
        `${method} ${path} reported failure despite ${response.status}`,
      );
    }

    return parsed.data as T;
  };
}
