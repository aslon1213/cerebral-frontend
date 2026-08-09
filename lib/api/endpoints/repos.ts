import type { Requester } from "../http";
import type {
  CodeChangeContext,
  CodeChangeHistoryEntry,
  GitRepoConnected,
  GitRepoCreate,
  GitRepoResponse,
  GitRepoUpdate,
  ListGitReposParams,
  ListHistoryParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/repos";

/**
 * Repos, and the history that is the product's whole claim.
 *
 * `history` answers the question the product exists for: someone opens a file,
 * finds a line nobody understands, and this says which agent wrote it, on which
 * attempt, and — beside it — the reasoning that produced it.
 */
export function createReposApi(request: Requester) {
  return {
    /**
     * POST /api/v1/repos — 201 when it created the row, 200 when it did not.
     *
     * This connects rather than creates: it is idempotent by name, so calling
     * it twice returns the existing repo instead of a `409`. Branch on
     * `created` in the body rather than on the status code, and expect an
     * existing repo's `local_path` and `default_branch` to be refreshed by the
     * call.
     */
    connect(payload: GitRepoCreate, signal?: AbortSignal) {
      return request<GitRepoConnected>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /** GET /api/v1/repos — 200, paginated. */
    list(params: ListGitReposParams = {}, signal?: AbortSignal) {
      return request<Page<GitRepoResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/repos/{repo_id} — 200. */
    get(repoId: UUID, signal?: AbortSignal) {
      return request<GitRepoResponse>({
        path: `${BASE}/${encodeURIComponent(repoId)}`,
        signal,
      });
    },

    /** GET /api/v1/repos/by-name/{name} — 200. */
    getByName(name: string, signal?: AbortSignal) {
      return request<GitRepoResponse>({
        path: `${BASE}/by-name/${encodeURIComponent(name)}`,
        signal,
      });
    },

    /** PATCH /api/v1/repos/{repo_id} — 200, partial update. */
    update(repoId: UUID, payload: GitRepoUpdate, signal?: AbortSignal) {
      return request<GitRepoResponse>({
        method: "PATCH",
        path: `${BASE}/${encodeURIComponent(repoId)}`,
        body: payload,
        signal,
      });
    },

    /**
     * DELETE /api/v1/repos/{repo_id} — 200 with a null payload.
     *
     * `409 resource_in_use` when a run references it.
     */
    remove(repoId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(repoId)}`,
        signal,
      });
    },

    /**
     * GET /api/v1/repos/{repo_id}/history — 200, newest first.
     *
     * Every agent change to `path`, across every run, each one carrying the
     * event whose reasoning produced it. Omit `path` for the whole repo.
     */
    history(repoId: UUID, params: ListHistoryParams = {}, signal?: AbortSignal) {
      return request<Page<CodeChangeHistoryEntry>>({
        path: `${BASE}/${encodeURIComponent(repoId)}/history`,
        query: { ...params },
        signal,
      });
    },

    /**
     * GET /api/v1/repos/{repo_id}/history/{change_id} — 200.
     *
     * One change with its event and its whole execution.
     */
    historyEntry(repoId: UUID, changeId: UUID, signal?: AbortSignal) {
      return request<CodeChangeContext>({
        path: `${BASE}/${encodeURIComponent(repoId)}/history/${encodeURIComponent(changeId)}`,
        signal,
      });
    },
  };
}

export type ReposApi = ReturnType<typeof createReposApi>;
