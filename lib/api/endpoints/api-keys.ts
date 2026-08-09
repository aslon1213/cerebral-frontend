import type { Requester } from "../http";
import type {
  ApiKeyCreate,
  ApiKeyCreated,
  ApiKeyResponse,
  ListApiKeysParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/api-keys";

/**
 * Issuing credentials for bots — a person's action, about machines without
 * being for them.
 *
 * `GET /api-keys/verify` is not wrapped: it exists for a bot to check its own
 * key at startup, and is API-key-authenticated. Nothing in this UI has a key to
 * check — the secret is shown once, at creation, and never held again.
 */
export function createApiKeysApi(request: Requester) {
  return {
    /**
     * POST /api/v1/api-keys — 201.
     *
     * The only response that carries the secret. `key` is not recoverable from
     * any later request, so whatever calls this has to put it in front of the
     * user immediately or it is lost.
     */
    create(payload: ApiKeyCreate, signal?: AbortSignal) {
      return request<ApiKeyCreated>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /**
     * GET /api/v1/api-keys — 200, paginated.
     *
     * Revoked keys are hidden unless asked for. Rows carry `prefix`, never the
     * key itself.
     */
    list(params: ListApiKeysParams = {}, signal?: AbortSignal) {
      return request<Page<ApiKeyResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/api-keys/{key_id} — 200. Metadata only. */
    get(keyId: UUID, signal?: AbortSignal) {
      return request<ApiKeyResponse>({
        path: `${BASE}/${encodeURIComponent(keyId)}`,
        signal,
      });
    },

    /**
     * DELETE /api/v1/api-keys/{key_id} — 200 with a null payload.
     *
     * Revokes rather than deletes: the row survives with `revoked_at` set, so
     * a key that appears in an audit trail can still be named.
     */
    revoke(keyId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(keyId)}`,
        signal,
      });
    },
  };
}

export type ApiKeysApi = ReturnType<typeof createApiKeysApi>;
