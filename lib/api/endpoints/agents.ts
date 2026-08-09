import type { Requester } from "../http";
import type {
  AgentCreate,
  AgentResponse,
  AgentUpdate,
  ListAgentsParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/agents";

/** The agents runs are executed by. Ordinary CRUD, owner-scoped. */
export function createAgentsApi(request: Requester) {
  return {
    /** POST /api/v1/agents — 201. `409 duplicate_agent_name` on a clash. */
    create(payload: AgentCreate, signal?: AbortSignal) {
      return request<AgentResponse>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /** GET /api/v1/agents — 200, paginated. */
    list(params: ListAgentsParams = {}, signal?: AbortSignal) {
      return request<Page<AgentResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/agents/{agent_id} — 200. */
    get(agentId: UUID, signal?: AbortSignal) {
      return request<AgentResponse>({
        path: `${BASE}/${encodeURIComponent(agentId)}`,
        signal,
      });
    },

    /**
     * GET /api/v1/agents/by-name/{name} — 200.
     *
     * Lets a caller that only knows the name it configured resolve an id
     * without listing and filtering.
     */
    getByName(name: string, signal?: AbortSignal) {
      return request<AgentResponse>({
        path: `${BASE}/by-name/${encodeURIComponent(name)}`,
        signal,
      });
    },

    /** PATCH /api/v1/agents/{agent_id} — 200, partial update. */
    update(agentId: UUID, payload: AgentUpdate, signal?: AbortSignal) {
      return request<AgentResponse>({
        method: "PATCH",
        path: `${BASE}/${encodeURIComponent(agentId)}`,
        body: payload,
        signal,
      });
    },

    /**
     * DELETE /api/v1/agents/{agent_id} — 200 with a null payload.
     *
     * `409 resource_in_use` when a run references it: a run is an audit record,
     * so the thing that produced it cannot be deleted out from under it.
     * Deactivating (`is_active: false`) is the way to retire one.
     */
    remove(agentId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(agentId)}`,
        signal,
      });
    },
  };
}

export type AgentsApi = ReturnType<typeof createAgentsApi>;
