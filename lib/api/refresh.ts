import { createApiClient } from "./client";
import type { TokenResponse } from "./types";

/**
 * Exchange a refresh token for a new pair.
 *
 * Deliberately free of `next/headers` so the edge proxy can call it too;
 * persisting the result is the caller's job because the mechanism differs
 * (cookie store in actions, response cookies in the proxy).
 *
 * Returns `null` when the refresh token is rejected or the API is unreachable —
 * both mean "send the user to sign in", and neither is worth throwing over.
 */
export async function performRefresh(
  refreshToken: string,
  baseUrl?: string,
): Promise<TokenResponse | null> {
  try {
    const client = createApiClient({ baseUrl });
    return await client.auth.refresh({ refresh_token: refreshToken });
  } catch {
    return null;
  }
}
