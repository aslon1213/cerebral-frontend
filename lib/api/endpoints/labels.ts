import type { Requester } from "../http";
import type {
  LabelCreate,
  LabelResponse,
  LabelUpdate,
  ListLabelsParams,
  Page,
  UUID,
} from "../types";

const BASE = "/api/v1/labels";

export function createLabelsApi(request: Requester) {
  return {
    /** POST /api/v1/labels — 201. */
    create(payload: LabelCreate, signal?: AbortSignal) {
      return request<LabelResponse>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /** GET /api/v1/labels — 200, paginated. */
    list(params: ListLabelsParams = {}, signal?: AbortSignal) {
      return request<Page<LabelResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/labels/{label_id} — 200. */
    get(labelId: UUID, signal?: AbortSignal) {
      return request<LabelResponse>({
        path: `${BASE}/${encodeURIComponent(labelId)}`,
        signal,
      });
    },

    /** PATCH /api/v1/labels/{label_id} — 200, partial update. */
    update(labelId: UUID, payload: LabelUpdate, signal?: AbortSignal) {
      return request<LabelResponse>({
        method: "PATCH",
        path: `${BASE}/${encodeURIComponent(labelId)}`,
        body: payload,
        signal,
      });
    },

    /** DELETE /api/v1/labels/{label_id} — 200 with a null payload. */
    remove(labelId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(labelId)}`,
        signal,
      });
    },
  };
}

export type LabelsApi = ReturnType<typeof createLabelsApi>;
