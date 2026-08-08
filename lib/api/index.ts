/**
 * Public entry point for the Cerebral API client.
 *
 * Safe to import from anywhere. The session-bound client lives in
 * `lib/api/server` and is intentionally *not* re-exported here — it touches
 * `next/headers` and would break any Client Component that imported this file.
 */

export * from "./types";
export * from "./errors";
export { createApiClient, createApiClientFromRequester, type ApiClient } from "./client";
export {
  createRequester,
  buildQueryString,
  resolveBaseUrl,
  DEFAULT_BASE_URL,
  type HttpMethod,
  type RequestOptions,
  type Requester,
} from "./http";
