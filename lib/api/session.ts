import { cookies } from "next/headers";

import type { TokenResponse } from "./types";

/**
 * Token storage.
 *
 * Tokens live in httpOnly cookies, never in localStorage: the API sends no CORS
 * headers, so the browser cannot call it directly anyway — every request is
 * proxied through the Next.js server, which is the only place the token needs
 * to be readable. httpOnly also keeps it out of reach of XSS.
 *
 * Server-only. Importing this from a Client Component will fail to build.
 */

export const ACCESS_TOKEN_COOKIE = "cerebral_access_token";
export const REFRESH_TOKEN_COOKIE = "cerebral_refresh_token";

/** Backend issues refresh tokens with a 30-day lifetime. */
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Used when the access token carries no readable `exp`. */
const ACCESS_FALLBACK_MAX_AGE_SECONDS = 60 * 30;
/** Refresh this far ahead of expiry to absorb clock skew and request latency. */
export const REFRESH_SKEW_SECONDS = 60;

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/**
 * Read the `exp` claim without verifying the signature.
 *
 * Verification is the backend's job; here we only need to know when to refresh,
 * and a forged `exp` can at worst cause a pointless refresh attempt.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    const claims = JSON.parse(json) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

/** True when the token is missing, unreadable, or within the skew window of expiry. */
export function isTokenExpired(token: string | undefined | null): boolean {
  if (!token) return true;
  const exp = getTokenExpiry(token);
  if (exp === null) return false; // Unreadable: let the API be the judge.
  return exp - REFRESH_SKEW_SECONDS <= Math.floor(Date.now() / 1000);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Persist a freshly issued token pair.
 *
 * Only callable from a Server Action or Route Handler — Next.js forbids setting
 * cookies during a Server Component render, and throws if you try.
 */
export async function setSession(tokens: TokenResponse): Promise<void> {
  const store = await cookies();
  const exp = getTokenExpiry(tokens.access_token);
  const accessMaxAge =
    exp === null
      ? ACCESS_FALLBACK_MAX_AGE_SECONDS
      : Math.max(1, exp - Math.floor(Date.now() / 1000));

  store.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...baseCookieOptions(),
    maxAge: accessMaxAge,
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    ...baseCookieOptions(),
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

/** Clear both cookies. Server Action / Route Handler only. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Persist a token pair, reporting whether the write landed.
 *
 * Cookie writes are only permitted in Server Actions and Route Handlers; during
 * a Server Component render Next.js throws. Callers use the `false` result to
 * decide whether the rotated refresh token was durably stored.
 */
export async function trySetSession(tokens: TokenResponse): Promise<boolean> {
  try {
    await setSession(tokens);
    return true;
  } catch {
    return false;
  }
}
