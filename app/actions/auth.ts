"use server";

import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api/client";
import { ApiError, ApiNetworkError } from "@/lib/api/errors";
import { clearSession, getRefreshToken, setSession } from "@/lib/api/session";

/**
 * Auth Server Actions.
 *
 * Login and register run unauthenticated, so they use a plain client rather
 * than the session-bound one. Tokens are written to httpOnly cookies here —
 * a Server Action is one of the few places Next.js permits cookie writes.
 */

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const client = createApiClient();

function toFormState(error: unknown, fallback: string): AuthFormState {
  if (error instanceof ApiError) {
    if (error.isValidation) {
      const { _: formError, ...fieldErrors } = error.fieldErrors;
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      return {
        // Prefer a whole-payload complaint, then the generic nudge toward the
        // highlighted fields, then whatever the API said.
        error: formError ?? (hasFieldErrors ? "Please correct the errors below." : error.message),
        fieldErrors,
      };
    }
    // 5xx messages are deliberately vague; the request id is what makes a
    // report actionable, so keep it in front of the user.
    if (error.isServerError && error.requestId) {
      return { error: `${error.message} (request id: ${error.requestId})` };
    }
    return { error: error.message };
  }
  if (error instanceof ApiNetworkError) {
    return { error: error.message };
  }
  return { error: fallback };
}

function readCredentials(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

/**
 * Constrain the post-login destination to a path on this origin.
 *
 * Server Actions are reachable by direct POST, so this cannot be left to the
 * page that renders the form — `//evil.com` would otherwise be an open redirect.
 */
function safeRedirectTarget(formData: FormData): string {
  const raw = String(formData.get("redirectTo") ?? "");
  // `/` is the marketing page, so it is not somewhere signing in should land
  // you — the workspace is.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw === "/") {
    return "/projects";
  }
  return raw;
}

/**
 * Sign in and redirect to `redirectTo`.
 *
 * Shaped for `useActionState`, so it returns errors rather than throwing.
 */
export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);
  if (!credentials.name || !credentials.password) {
    return { error: "Name and password are both required." };
  }

  try {
    const tokens = await client.auth.login(credentials);
    await setSession(tokens);
  } catch (error) {
    return toFormState(error, "Could not sign in. Please try again.");
  }

  // `redirect` throws internally, so it must sit outside the try/catch.
  redirect(safeRedirectTarget(formData));
}

/** Create an account, then sign in with the same credentials. */
export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);
  if (!credentials.name || !credentials.password) {
    return { error: "Name and password are both required." };
  }

  try {
    await client.auth.register(credentials);
    const tokens = await client.auth.login(credentials);
    await setSession(tokens);
  } catch (error) {
    return toFormState(error, "Could not create the account. Please try again.");
  }

  redirect(safeRedirectTarget(formData));
}

/**
 * Revoke the refresh token server-side and clear the cookies.
 *
 * The local session is cleared even if the API call fails — otherwise a
 * backend blip would leave the user stuck signed in.
 */
export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await client.auth.logout(refreshToken);
    } catch {
      // Best effort; the cookie clear below is what the user can observe.
    }
  }
  await clearSession();
  redirect("/login");
}
