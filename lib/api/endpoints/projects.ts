import type { Requester } from "../http";
import type {
  ListProjectsParams,
  Page,
  ProjectCreate,
  ProjectResponse,
  ProjectUpdate,
  TaskFilterParams,
  TaskResponse,
  UUID,
} from "../types";

const BASE = "/api/v1/projects";

export function createProjectsApi(request: Requester) {
  return {
    /** POST /api/v1/projects — 201. */
    create(payload: ProjectCreate, signal?: AbortSignal) {
      return request<ProjectResponse>({
        method: "POST",
        path: BASE,
        body: payload,
        signal,
      });
    },

    /** GET /api/v1/projects — 200, paginated. */
    list(params: ListProjectsParams = {}, signal?: AbortSignal) {
      return request<Page<ProjectResponse>>({
        path: BASE,
        query: { ...params },
        signal,
      });
    },

    /** GET /api/v1/projects/{project_id} — 200. */
    get(projectId: UUID, signal?: AbortSignal) {
      return request<ProjectResponse>({
        path: `${BASE}/${encodeURIComponent(projectId)}`,
        signal,
      });
    },

    /** PATCH /api/v1/projects/{project_id} — 200, partial update. */
    update(projectId: UUID, payload: ProjectUpdate, signal?: AbortSignal) {
      return request<ProjectResponse>({
        method: "PATCH",
        path: `${BASE}/${encodeURIComponent(projectId)}`,
        body: payload,
        signal,
      });
    },

    /** DELETE /api/v1/projects/{project_id} — 200 with a null payload. */
    remove(projectId: UUID, signal?: AbortSignal) {
      return request<void>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(projectId)}`,
        signal,
      });
    },

    /** PUT /api/v1/projects/{project_id}/labels/{label_id} — 200, returns the updated project. */
    attachLabel(projectId: UUID, labelId: UUID, signal?: AbortSignal) {
      return request<ProjectResponse>({
        method: "PUT",
        path: `${BASE}/${encodeURIComponent(projectId)}/labels/${encodeURIComponent(labelId)}`,
        signal,
      });
    },

    /** DELETE /api/v1/projects/{project_id}/labels/{label_id} — 200, returns the updated project. */
    detachLabel(projectId: UUID, labelId: UUID, signal?: AbortSignal) {
      return request<ProjectResponse>({
        method: "DELETE",
        path: `${BASE}/${encodeURIComponent(projectId)}/labels/${encodeURIComponent(labelId)}`,
        signal,
      });
    },

    /** GET /api/v1/projects/{project_id}/tasks — 200, paginated tasks scoped to the project. */
    listTasks(projectId: UUID, params: TaskFilterParams = {}, signal?: AbortSignal) {
      return request<Page<TaskResponse>>({
        path: `${BASE}/${encodeURIComponent(projectId)}/tasks`,
        query: { ...params },
        signal,
      });
    },
  };
}

export type ProjectsApi = ReturnType<typeof createProjectsApi>;
