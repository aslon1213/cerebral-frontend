import type { Requester } from "../http";
import type {
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
} from "../types";

const BASE = "/api/v1/auth";

export function createAuthApi(request: Requester) {
  return {
    /** POST /api/v1/auth/register — 201. Does not log the user in. */
    register(payload: RegisterRequest, signal?: AbortSignal) {
      return request<UserResponse>({
        method: "POST",
        path: `${BASE}/register`,
        body: payload,
        token: null,
        signal,
      });
    },

    /** POST /api/v1/auth/login — 200, returns an access/refresh pair. */
    login(payload: LoginRequest, signal?: AbortSignal) {
      return request<TokenResponse>({
        method: "POST",
        path: `${BASE}/login`,
        body: payload,
        token: null,
        signal,
      });
    },

    /** POST /api/v1/auth/refresh — 200, exchanges a refresh token for a new pair. */
    refresh(payload: RefreshRequest, signal?: AbortSignal) {
      return request<TokenResponse>({
        method: "POST",
        path: `${BASE}/refresh`,
        body: payload,
        token: null,
        signal,
      });
    },

    /** POST /api/v1/auth/logout — 200 with a null payload; revokes the refresh token. */
    logout(refreshToken: string, signal?: AbortSignal) {
      return request<void>({
        method: "POST",
        path: `${BASE}/logout`,
        body: { refresh_token: refreshToken },
        token: null,
        signal,
      });
    },

    /** GET /api/v1/auth/me — 200, the authenticated user. Requires a token. */
    me(signal?: AbortSignal) {
      return request<UserResponse>({ path: `${BASE}/me`, signal });
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
