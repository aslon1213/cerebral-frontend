/**
 * Types mirroring the FastAPI OpenAPI schema at /openapi.json (Cerebral API v0.1.0).
 *
 * Date-time fields are ISO 8601 strings exactly as the API returns them; parse at
 * the edge where you need `Date` rather than guessing a timezone here.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PROJECT_SORTS = [
  "name",
  "priority",
  "started_date",
  "target_date",
  "created_at",
  "updated_at",
] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const TASK_SORTS = [
  "name",
  "priority",
  "status",
  "due_date",
  "created_at",
  "updated_at",
] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export const LABEL_SORTS = ["name", "created_at", "updated_at"] as const;
export type LabelSort = (typeof LABEL_SORTS)[number];

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type UUID = string;
/** ISO 8601 date-time, e.g. "2026-07-28T10:17:42.116156Z". */
export type DateTimeString = string;

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  /** 1–200, defaults to 50 server-side. */
  limit?: number;
  /** >= 0, defaults to 0 server-side. */
  offset?: number;
}

/**
 * What went wrong, in a form code can branch on.
 *
 * Per the API docs these values are part of the contract: once released a code
 * keeps its meaning, while the `message` beside it may be reworded at any time.
 * Branch on `code`; show `message`.
 */
export const ERROR_CODES = [
  "bad_request",
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "method_not_allowed",
  "conflict",
  "too_many_requests",
  "internal_error",
  "service_unavailable",
  "unknown_labels",
  "duplicate_label_name",
  "invalid_date_range",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** The error half of a response. Safe to show to a user as it stands. */
export interface ApiErrorPayload {
  code: ErrorCode;
  message: string;
  /**
   * Extra context, shaped however the code sees fit — `validation_error`
   * carries `FieldError[]`, most others carry `null`. Clients that don't
   * recognise the code should show `message` and ignore this.
   */
  details?: unknown;
}

/** One field-level problem, as carried by `validation_error` details. */
export interface FieldError {
  /**
   * Field name with the `body.` / `query.` prefix stripped, so it lines up with
   * a form control's `name`. Whole-payload errors (the API sends a bare
   * `"body"`) are keyed `_`.
   */
  field: string;
  message: string;
  type?: string;
}

/**
 * The envelope every endpoint answers with, success or failure.
 *
 * `data` holds the payload on success; endpoints that return nothing
 * (deletes, logout) answer 200 with `data: null`.
 */
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
  /** Trace id shared across services. Quote it when reporting a problem. */
  request_id: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  name: string;
  password: string;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: UUID;
  name: string;
  is_active: boolean;
  created_at: DateTimeString;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export interface LabelResponse {
  id: UUID;
  name: string;
  description: string | null;
  created_by: UUID;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface LabelCreate {
  /** 1–64 chars. */
  name: string;
  /** Max 500 chars. */
  description?: string | null;
}

export interface LabelUpdate {
  name?: string | null;
  description?: string | null;
}

export interface ListLabelsParams extends PaginationParams {
  /** Free-text search, max 100 chars. */
  q?: string | null;
  /** Defaults to "name" server-side. */
  sort_by?: LabelSort;
  /** Defaults to "asc" server-side. */
  order?: SortOrder;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface ProjectResponse {
  id: UUID;
  created_by: UUID;
  name: string;
  description: string | null;
  priority: Priority;
  started_date: DateTimeString | null;
  target_date: DateTimeString | null;
  goals: string[];
  labels: LabelResponse[];
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface ProjectCreate {
  /** 1–200 chars. */
  name: string;
  description?: string | null;
  /** Defaults to "low" server-side. */
  priority?: Priority;
  started_date?: DateTimeString | null;
  target_date?: DateTimeString | null;
  goals?: string[];
  label_ids?: UUID[];
}

export interface ProjectUpdate {
  name?: string | null;
  description?: string | null;
  priority?: Priority | null;
  started_date?: DateTimeString | null;
  target_date?: DateTimeString | null;
  goals?: string[] | null;
  label_ids?: UUID[] | null;
}

export interface ListProjectsParams extends PaginationParams {
  q?: string | null;
  priority?: Priority | null;
  label_id?: UUID | null;
  /** Defaults to "created_at" server-side. */
  sort_by?: ProjectSort;
  /** Defaults to "desc" server-side. */
  order?: SortOrder;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskResponse {
  id: UUID;
  project_id: UUID;
  created_by: UUID;
  name: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: DateTimeString | null;
  labels: LabelResponse[];
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface TaskCreate {
  project_id: UUID;
  /** 1–200 chars. */
  name: string;
  description?: string | null;
  /** Defaults to "low" server-side. */
  priority?: Priority;
  /** Defaults to "todo" server-side. */
  status?: TaskStatus;
  due_date?: DateTimeString | null;
  label_ids?: UUID[];
}

export interface TaskUpdate {
  /** Set to move the task to a different project. */
  project_id?: UUID | null;
  name?: string | null;
  description?: string | null;
  priority?: Priority | null;
  status?: TaskStatus | null;
  due_date?: DateTimeString | null;
  label_ids?: UUID[] | null;
}

/** Filters shared by `GET /tasks` and `GET /projects/{id}/tasks`. */
export interface TaskFilterParams extends PaginationParams {
  q?: string | null;
  priority?: Priority | null;
  status?: TaskStatus | null;
  label_id?: UUID | null;
  due_before?: DateTimeString | null;
  due_after?: DateTimeString | null;
  /** Defaults to "created_at" server-side. */
  sort_by?: TaskSort;
  /** Defaults to "desc" server-side. */
  order?: SortOrder;
}

export interface ListTasksParams extends TaskFilterParams {
  project_id?: UUID | null;
}
