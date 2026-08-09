import type { Requester } from "../http";
import type {
  CodeChangeResponse,
  EventPage,
  ExecutionDetail,
  ExecutionEventDetail,
  ExecutionRepoResponse,
  ExecutionResponse,
  InterventionResponse,
  ListEventsParams,
  ListExecutionChangesParams,
  ListExecutionInterventionsParams,
  ListExecutionsParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/executions";

/**
 * Runs, read-only but for one deletion.
 *
 * Everything that *writes* a run — creating it, driving its state machine
 * (start/complete/fail/cancel), reporting usage, appending events, attaching
 * repos, opening interventions — is the observer bot's job and is API-key-only
 * at the server. A session token gets 401 there by design, so those endpoints
 * are deliberately not wrapped here: every line of a transcript has to be
 * attributable to a credential issued for an agent.
 */
export function createExecutionsApi(request: Requester) {
  return {
    /**
     * GET /api/v1/executions — 200, offset-paginated, newest first.
     *
     * No git state on these rows; only `get` inlines `repos`.
     */
    list(params: ListExecutionsParams = {}, signal?: AbortSignal) {
      return request<Page<ExecutionResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/executions/{execution_id} — 200, with `repos` inlined. */
    get(executionId: UUID, signal?: AbortSignal) {
      return request<ExecutionDetail>({
        path: `${BASE}/${encodeURIComponent(executionId)}`,
        signal,
      });
    },

    /**
     * DELETE /api/v1/executions/{execution_id} — 200 with a null payload.
     *
     * Refuses with `409 history_exists` when the run recorded anything; pass
     * `purge` to drop its events and code changes with it. That destroys an
     * audit record and cannot be undone, so confirm it properly first.
     */
    remove(executionId: UUID, options: { purge?: boolean } = {}, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(executionId)}`,
        query: { purge: options.purge },
        signal,
      });
    },

    /**
     * GET /api/v1/executions/{id}/events — 200, **cursor-paginated**, oldest first.
     *
     * Unlike every other list here this one has no `total` and no offset: pass
     * the `next_after_seq` you were handed back as `after_seq`, starting at 0.
     * An empty page means you are caught up, which is how a live run is tailed.
     */
    events(executionId: UUID, params: ListEventsParams = {}, signal?: AbortSignal) {
      return request<EventPage>({
        path: `${BASE}/${encodeURIComponent(executionId)}/events`,
        query: { ...params },
        signal,
      });
    },

    /**
     * GET /api/v1/executions/{id}/events/{event_id} — 200.
     *
     * The same event with its `code_changes` expanded; that expansion is the
     * authoritative list, not the ids in `payload.code_changes`.
     */
    event(executionId: UUID, eventId: UUID, signal?: AbortSignal) {
      return request<ExecutionEventDetail>({
        path: `${BASE}/${encodeURIComponent(executionId)}/events/${encodeURIComponent(eventId)}`,
        signal,
      });
    },

    /** GET /api/v1/executions/{id}/changes — 200, everything this run touched. */
    changes(
      executionId: UUID,
      params: ListExecutionChangesParams = {},
      signal?: AbortSignal,
    ) {
      return request<Page<CodeChangeResponse>>({
        path: `${BASE}/${encodeURIComponent(executionId)}/changes`,
        query: { ...params },
        signal,
      });
    },

    /**
     * GET /api/v1/executions/{id}/repos — 200.
     *
     * Returns a bare list, **not** a `Page`. Do not reach for `.items`.
     */
    repos(executionId: UUID, signal?: AbortSignal) {
      return request<ExecutionRepoResponse[]>({
        path: `${BASE}/${encodeURIComponent(executionId)}/repos`,
        signal,
      });
    },

    /** GET /api/v1/executions/{id}/interventions — 200, this run's asks. */
    interventions(
      executionId: UUID,
      params: ListExecutionInterventionsParams = {},
      signal?: AbortSignal,
    ) {
      return request<Page<InterventionResponse>>({
        path: `${BASE}/${encodeURIComponent(executionId)}/interventions`,
        query: { ...params },
        signal,
      });
    },
  };
}

export type ExecutionsApi = ReturnType<typeof createExecutionsApi>;
