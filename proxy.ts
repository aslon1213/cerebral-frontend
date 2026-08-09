import { NextResponse, type NextRequest } from "next/server";

import { performRefresh } from "@/lib/api/refresh";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  isTokenExpired,
} from "@/lib/api/session";

/**
 * Proxy — what earlier Next.js versions called Middleware (renamed in 16).
 *
 * Two jobs:
 *  1. Refresh the access token just before it expires, while we are still in a
 *     context that can write cookies. A Server Component render cannot, so
 *     doing it here is what keeps sessions alive across navigations.
 *  2. Keep guests out of app routes and signed-in users off the auth routes.
 *
 * This is an optimistic check, not authorization: the API remains the only
 * authority on whether a token is valid. Server Actions and data fetches must
 * still handle 401 themselves.
 */

/**
 * The landing page. Public, and — unlike the auth routes — it stays reachable
 * once you are signed in: it is a page people share, and bouncing someone off
 * a link they were sent is worse than showing them a page they have outgrown.
 */
const LANDING_PATH = "/";

/** Reachable without a session, and pointless with one. */
const GUEST_PATHS = ["/login", "/register"];

/**
 * Where a signed-in user is sent when they land somewhere that is not for them.
 *
 * The inbox, because it is the only screen that can be urgent: anything on it
 * is an agent that has stopped and is waiting on this person.
 */
const APP_HOME = "/inbox";

function isGuestPath(pathname: string): boolean {
  return GUEST_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isPublicPath(pathname: string): boolean {
  return pathname === LANDING_PATH || isGuestPath(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let hasValidAccess = accessToken !== undefined && !isTokenExpired(accessToken);
  let refreshed: Awaited<ReturnType<typeof performRefresh>> = null;

  // Proactively refresh while we can still persist the result.
  if (!hasValidAccess && refreshToken) {
    refreshed = await performRefresh(refreshToken);
    hasValidAccess = refreshed !== null;
  }

  const signedIn = hasValidAccess;

  let response: NextResponse;
  if (!signedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where they were headed so login can send them back.
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    response = NextResponse.redirect(loginUrl);
    // The refresh token is spent or invalid — drop it so we stop retrying.
    if (refreshToken && refreshed === null) {
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
    }
    return response;
  }

  if (signedIn && isGuestPath(pathname)) {
    response = NextResponse.redirect(new URL(APP_HOME, request.url));
  } else {
    response = NextResponse.next();
  }

  if (refreshed) {
    const secure = process.env.NODE_ENV === "production";
    const options = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
    response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.access_token, options);
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refresh_token, {
      ...options,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  // Skip Next.js internals and static assets — without this the proxy would run
  // on every CSS/JS/image request and could redirect them to /login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
