import type { Requester } from "../http";
import type {
  ListTasksParams,
  Page,
  TaskCreate,
  TaskResponse,
  TaskUpdate,
  UUID,
} from "../types";

const BASE = "/api/v1/tasks";

export function createTasksApi(request: Requester) {
  return {
    /** POST /api/v1/tasks — 201. */
    create(payload: TaskCreate, signal?: AbortSignal) {
      return request<TaskResponse>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /** GET /api/v1/tasks — 200, paginated across all projects unless filtered. */
    list(params: ListTasksParams = {}, signal?: AbortSignal) {
      return request<Page<TaskResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/tasks/{task_id} — 200. */
    get(taskId: UUID, signal?: AbortSignal) {
      return request<TaskResponse>({
        path: `${BASE}/${encodeURIComponent(taskId)}`,
        signal,
      });
    },

    /** PATCH /api/v1/tasks/{task_id} — 200, partial update. */
    update(taskId: UUID, payload: TaskUpdate, signal?: AbortSignal) {
      return request<TaskResponse>({
        method: "PATCH",
        path: `${BASE}/${encodeURIComponent(taskId)}`,
        body: payload,
        signal,
      });
    },

    /** DELETE /api/v1/tasks/{task_id} — 200 with a null payload. */
    remove(taskId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(taskId)}`,
        signal,
      });
    },

    /** PUT /api/v1/tasks/{task_id}/labels/{label_id} — 200, returns the updated task. */
    attachLabel(taskId: UUID, labelId: UUID, signal?: AbortSignal) {
      return request<TaskResponse>({
        method: "PUT",
        path: `${BASE}/${encodeURIComponent(taskId)}/labels/${encodeURIComponent(labelId)}`,
        signal,
      });
    },

    /** DELETE /api/v1/tasks/{task_id}/labels/{label_id} — 200, returns the updated task. */
    detachLabel(taskId: UUID, labelId: UUID, signal?: AbortSignal) {
      return request<TaskResponse>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(taskId)}/labels/${encodeURIComponent(labelId)}`,
        signal,
      });
    },
  };
}

export type TasksApi = ReturnType<typeof createTasksApi>;
