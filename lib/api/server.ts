import { createApiClientFromRequester, type ApiClient } from "./client";
import { ApiError, SessionExpiredError } from "./errors";
import { createRequester, type RequestOptions } from "./http";
import { performRefresh } from "./refresh";
import { getAccessToken, getRefreshToken, trySetSession } from "./session";
import type { UserResponse } from "./types";

/**
 * The API client for server-side use: Server Components, Server Actions and
 * Route Handlers. Reads the bearer token from the session cookie on every call
 * and recovers from a 401 by refreshing once.
 *
 * Server-only — it reaches for `next/headers`, which fails to build if this is
 * imported from a Client Component.
 *
 * ```ts
 * import { api } from "@/lib/api/server";
 * const page = await api.projects.list({ limit: 20, sort_by: "updated_at" });
 * ```
 */

const baseRequest = createRequester({ getToken: getAccessToken });

async function sessionRequest<T>(options: RequestOptions): Promise<T> {
  try {
    return await baseRequest<T>(options);
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isUnauthorized) throw error;

    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new SessionExpiredError();

    const tokens = await performRefresh(refreshToken);
    if (!tokens) throw new SessionExpiredError();

    // A Server Component render cannot write cookies, so this may not persist.
    // We still retry with the new access token so the current render succeeds;
    // if the backend rotated the refresh token, the stale cookie fails on the
    // next navigation and the proxy redirects to /login. Proactive refresh in
    // proxy.ts keeps that path rare.
    await trySetSession(tokens);

    return await baseRequest<T>({ ...options, token: tokens.access_token });
  }
}

export const api: ApiClient = createApiClientFromRequester(sessionRequest);

/** True when a session cookie is present. Does not prove the token still works. */
export async function hasSession(): Promise<boolean> {
  return (await getAccessToken()) !== undefined || (await getRefreshToken()) !== undefined;
}

/**
 * The signed-in user, or `null` when there is no usable session.
 *
 * Use in layouts/pages that render differently for guests; call `api.auth.me()`
 * directly when an unauthenticated caller should be an error.
 */
export async function getCurrentUser(): Promise<UserResponse | null> {
  try {
    return await api.auth.me();
  } catch (error) {
    if (error instanceof SessionExpiredError) return null;
    if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) return null;
    throw error;
  }
}
