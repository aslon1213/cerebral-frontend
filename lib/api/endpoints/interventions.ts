import type { Requester } from "../http";
import type {
  InterventionAnswer,
  InterventionDecision,
  InterventionResponse,
  PaginationParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/interventions";

/**
 * The inbox: everything waiting on the signed-in user.
 *
 * The person answers; the *agent* asks. Opening an intervention is on the
 * ingest path (`POST /executions/{id}/interventions`) and is not wrapped here.
 *
 * Resolving one usually unblocks its run — but not always, since several may be
 * open at once and the run stays parked until the last is dealt with. Re-read
 * the execution afterwards rather than assuming it went back to `running`.
 */
export function createInterventionsApi(request: Requester) {
  return {
    /**
     * GET /api/v1/interventions — 200, pending only, **oldest first**.
     *
     * The order is the point: the agent blocked longest is losing the most time.
     */
    list(params: PaginationParams = {}, signal?: AbortSignal) {
      return request<Page<InterventionResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/interventions/{intervention_id} — 200. */
    get(interventionId: UUID, signal?: AbortSignal) {
      return request<InterventionResponse>({
        path: `${BASE}/${encodeURIComponent(interventionId)}`,
        signal,
      });
    },

    /**
     * POST /api/v1/interventions/{id}/approve — 200.
     *
     * For `approval` and `qa_review` only; approving a question is
     * `409 intervention_kind_mismatch`.
     */
    approve(interventionId: UUID, payload: InterventionDecision = {}, signal?: AbortSignal) {
      return request<InterventionResponse>({
        method: "POST",
        path: `${BASE}/${encodeURIComponent(interventionId)}/approve`,
        body: payload,
        signal,
      });
    },

    /** POST /api/v1/interventions/{id}/reject — 200. Same kinds as `approve`. */
    reject(interventionId: UUID, payload: InterventionDecision = {}, signal?: AbortSignal) {
      return request<InterventionResponse>({
        method: "POST",
        path: `${BASE}/${encodeURIComponent(interventionId)}/reject`,
        body: payload,
        signal,
      });
    },

    /**
     * POST /api/v1/interventions/{id}/answer — 200.
     *
     * For `input_required` only, and `response` is required: answering a
     * question with nothing is the one thing that makes no sense.
     */
    answer(interventionId: UUID, payload: InterventionAnswer, signal?: AbortSignal) {
      return request<InterventionResponse>({
        method: "POST",
        path: `${BASE}/${encodeURIComponent(interventionId)}/answer`,
        body: payload,
        signal,
      });
    },
  };
}

export type InterventionsApi = ReturnType<typeof createInterventionsApi>;
