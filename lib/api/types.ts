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
  "duplicate_agent_name",
  "duplicate_repo_name",
  "resource_in_use",
  "invalid_transition",
  "history_exists",
  "repo_already_attached",
  "repo_not_attached",
  "unknown_parent_event",
  "invalid_code_change",
  "intervention_already_resolved",
  "intervention_kind_mismatch",
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

// ---------------------------------------------------------------------------
// Executions (runs)
//
// Read-only to this UI, with one exception: a person may delete a run. Every
// write on the ingest path — creating a run, driving its state machine,
// appending events, recording code changes, opening interventions — is the
// observer bot's job and is API-key-only at the server, so a session token gets
// 401. Those endpoints are deliberately absent from this client.
// ---------------------------------------------------------------------------

export const EXECUTOR_TYPES = ["human", "ai_agent"] as const;
export type ExecutorType = (typeof EXECUTOR_TYPES)[number];

export const EXECUTION_STATUSES = [
  "pending",
  "running",
  "waiting_approval",
  "waiting_input",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

/**
 * The three states a person actually cares about, which is not the same as the
 * seven the state machine has.
 *
 * `blocked` is the only one with any urgency: an agent in `waiting_approval` or
 * `waiting_input` has stopped and is waiting on a human, and every minute there
 * is time the run is not making progress.
 */
export const EXECUTION_PHASE = {
  live: ["pending", "running"],
  blocked: ["waiting_approval", "waiting_input"],
  over: ["succeeded", "failed", "cancelled"],
} as const satisfies Record<string, readonly ExecutionStatus[]>;

export type ExecutionPhase = keyof typeof EXECUTION_PHASE;

export function executionPhase(status: ExecutionStatus): ExecutionPhase {
  if ((EXECUTION_PHASE.live as readonly string[]).includes(status)) return "live";
  if ((EXECUTION_PHASE.blocked as readonly string[]).includes(status)) return "blocked";
  return "over";
}

/**
 * True while a run can still produce events — the condition for polling the
 * transcript. A terminal run never changes again, so polling it is waste.
 */
export function isExecutionLive(status: ExecutionStatus): boolean {
  return executionPhase(status) !== "over";
}

export const EXECUTION_SORTS = [
  "created_at",
  "updated_at",
  "started_at",
  "finished_at",
  "attempt",
  "status",
] as const;
export type ExecutionSort = (typeof EXECUTION_SORTS)[number];

/** Why a run failed, in a form code can branch on. */
export interface ExecutionError {
  code: string;
  message: string;
  /** Whether trying the task again is worth it — say so rather than parsing prose. */
  retryable: boolean;
  details: Record<string, unknown>;
}

export interface ExecutionResponse {
  id: UUID;
  task_id: UUID;
  created_by: UUID;
  /** Retry number for this task. "attempt 3" is meaningful; show it. */
  attempt: number;
  executor_type: ExecutorType;
  executor_user_id: UUID | null;
  executor_agent_id: UUID | null;
  status: ExecutionStatus;
  model: string | null;
  provider: string | null;
  additional_context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: ExecutionError | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  /** Decimal serialised as a string, so it is never rounded in transit. */
  cost_usd: string | null;
  /** High-water mark of the transcript. Compare with the last `seq` you hold
   *  to know you are behind without fetching anything. */
  last_event_seq: number;
  started_at: DateTimeString | null;
  finished_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/**
 * `GET /executions/{id}` — the same run with its git state inlined.
 *
 * The list endpoint deliberately omits `repos`: a project's worth of runs would
 * fan out into a query per row. So the detail view has git state and the list
 * view does not.
 */
export interface ExecutionDetail extends ExecutionResponse {
  repos: ExecutionRepoResponse[];
}

export interface ListExecutionsParams extends PaginationParams {
  task_id?: UUID | null;
  project_id?: UUID | null;
  status?: ExecutionStatus | null;
  agent_id?: UUID | null;
  repo_id?: UUID | null;
  /** Defaults to "created_at" server-side. */
  sort_by?: ExecutionSort;
  /** Defaults to "desc" server-side. */
  order?: SortOrder;
}

/** Git state for one repo in one run. */
export interface ExecutionRepoResponse {
  repo_id: UUID;
  /** Agents commit under `refs/cerebral/executions/<id>` — outside
   *  `refs/heads/*`, so invisible to normal git tooling until the run lands. */
  ref_name: string;
  base_commit_sha: string;
  head_commit_sha: string | null;
  landed_branch: string | null;
  landed_commit_shas: string[];
  merge_commit_sha: string | null;
  landed_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export const EXECUTION_EVENT_TYPES = [
  "chat_message",
  "reasoning",
  "decision",
  "tool_call",
  "tool_result",
  "code_change",
  "status_change",
  "intervention_requested",
  "intervention_resolved",
  "memory_loaded",
  "memory_saved",
] as const;
export type ExecutionEventType = (typeof EXECUTION_EVENT_TYPES)[number];

export const ACTOR_TYPES = ["agent", "user", "system"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export interface ExecutionEventPayload {
  /** The prose. This is the thing the product exists to keep. */
  reasoning: string | null;
  /** Untyped by design — its shape depends on `event_type`. Render it
   *  readably, but do not assume a schema. */
  data: Record<string, unknown>;
  /** Ids of the changes this event produced, in order. `ExecutionEventDetail`
   *  expands them, and that expansion is the authoritative list. */
  code_changes: UUID[];
}

export interface ExecutionEventResponse {
  id: UUID;
  execution_id: UUID;
  /** Monotonic within a run. The cursor for pagination, and the reason the
   *  transcript cannot use offsets. */
  seq: number;
  client_event_id: string | null;
  event_type: ExecutionEventType;
  actor_type: ActorType;
  actor_user_id: UUID | null;
  /** Links a `tool_result` back to its `tool_call`, so they can be nested. */
  parent_event_id: UUID | null;
  payload: ExecutionEventPayload;
  /** The commit that *produced* this change, in the agent's private namespace.
   *  Not the same thing as `CodeChangeResponse.landed_commit_sha`. */
  cerebral_commit_sha: string | null;
  created_at: DateTimeString;
}

/** `GET /executions/{id}/events/{event_id}` — the event with its changes expanded. */
export interface ExecutionEventDetail extends ExecutionEventResponse {
  code_changes: CodeChangeResponse[];
}

/**
 * Cursor pagination, used by the transcript and nothing else.
 *
 * There is no `total`. The transcript is appended to while you are reading it,
 * so an offset would shift under every event that arrives and page two would
 * skip or repeat whatever landed in between. Pass the `next_after_seq` you were
 * given back as `after_seq`; start at 0. An empty page means you are caught up,
 * which is also how you tail a live run.
 */
export interface EventPage {
  items: ExecutionEventResponse[];
  limit: number;
  next_after_seq: number | null;
  has_more: boolean;
}

export interface ListEventsParams {
  /** The cursor. Start at 0; then pass back the `next_after_seq` you hold. */
  after_seq?: number;
  /** 1–500, defaults to 100 server-side. */
  limit?: number;
  event_type?: ExecutionEventType | null;
  actor_type?: ActorType | null;
}

// ---------------------------------------------------------------------------
// Code changes
//
// The API returns git coordinates, never file content. A change carries blob
// ids and a path, not text. `diff` is an optional cache and is often null —
// nothing here may depend on it.
// ---------------------------------------------------------------------------

export const CHANGE_TYPES = ["created", "modified", "deleted", "renamed"] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

/** One cached hunk. Present only when the API happened to keep it. */
export interface CodeDiffApplied {
  old: string;
  new: string;
  line_start: number;
  line_end: number;
}

export interface CodeChangeResponse {
  id: UUID;
  execution_id: UUID;
  event_id: UUID;
  repo_id: UUID;
  seq: number | null;
  change_type: ChangeType;
  path: string;
  previous_path: string | null;
  language: string | null;
  before_blob: string | null;
  after_blob: string | null;
  /**
   * Where the run's work ended up on the default branch. `null` until the run
   * lands — and the *same value for every change of one repo in one run*, so it
   * says nothing about this change specifically beyond "landed, or not".
   */
  landed_commit_sha: string | null;
  lines_added: number;
  lines_deleted: number;
  /** A cache, not the source of truth. Usually null. */
  diff: CodeDiffApplied[] | null;
  applied_at: DateTimeString | null;
  reverts_change_id: UUID | null;
  created_at: DateTimeString;
}

/**
 * One row of a repo's history: the change, and the reasoning that produced it.
 *
 * `attempt` and `executor_agent_id` ride along so a row can say "the nightly
 * bot, on its second attempt" without another request.
 */
export interface CodeChangeHistoryEntry {
  change: CodeChangeResponse;
  event: ExecutionEventResponse;
  attempt: number;
  executor_agent_id: UUID | null;
}

/** `GET /repos/{id}/history/{change_id}` — one change, its event, its whole run. */
export interface CodeChangeContext {
  change: CodeChangeResponse;
  event: ExecutionEventResponse;
  execution: ExecutionResponse;
}

export interface ListHistoryParams extends PaginationParams {
  /** Omit for the whole repo. */
  path?: string | null;
}

export interface ListExecutionChangesParams extends PaginationParams {
  repo_id?: UUID | null;
}

// ---------------------------------------------------------------------------
// Interventions — the inbox
// ---------------------------------------------------------------------------

export const INTERVENTION_KINDS = ["approval", "qa_review", "input_required"] as const;
export type InterventionKind = (typeof INTERVENTION_KINDS)[number];

export const INTERVENTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "answered",
  "expired",
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export interface InterventionResponse {
  id: UUID;
  execution_id: UUID;
  event_id: UUID | null;
  resolution_event_id: UUID | null;
  kind: InterventionKind;
  status: InterventionStatus;
  /** Free-form: the agent decides the shape. Render readably, assume nothing. */
  request: Record<string, unknown>;
  response: Record<string, unknown> | null;
  expires_at: DateTimeString | null;
  resolved_by_user_id: UUID | null;
  resolved_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** Body for approve and reject. Both may carry a note back to the agent. */
export interface InterventionDecision {
  response?: Record<string, unknown> | null;
  reasoning?: string | null;
}

/** Body for answer. `response` is required — a question needs an answer. */
export interface InterventionAnswer {
  response: Record<string, unknown>;
  reasoning?: string | null;
}

export interface ListExecutionInterventionsParams extends PaginationParams {
  status?: InterventionStatus | null;
}

/**
 * Which of the three verbs a kind takes.
 *
 * Approving a question, or answering an approval, is `409
 * intervention_kind_mismatch` — so the control a person sees has to be decided
 * by the kind rather than offered as a free choice.
 */
export function interventionActions(
  kind: InterventionKind,
): readonly ("approve" | "reject" | "answer")[] {
  return kind === "input_required" ? ["answer"] : ["approve", "reject"];
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const AGENT_SORTS = ["name", "created_at", "updated_at"] as const;
export type AgentSort = (typeof AGENT_SORTS)[number];

export interface AgentResponse {
  id: UUID;
  created_by: UUID;
  name: string;
  description: string | null;
  default_model: string | null;
  is_active: boolean;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface AgentCreate {
  name: string;
  description?: string | null;
  default_model?: string | null;
  is_active?: boolean;
}

export interface AgentUpdate {
  name?: string | null;
  description?: string | null;
  default_model?: string | null;
  is_active?: boolean | null;
}

export interface ListAgentsParams extends PaginationParams {
  q?: string | null;
  is_active?: boolean | null;
  sort_by?: AgentSort;
  order?: SortOrder;
}

// ---------------------------------------------------------------------------
// Git repos
// ---------------------------------------------------------------------------

export const GIT_REPO_SORTS = ["name", "created_at", "updated_at"] as const;
export type GitRepoSort = (typeof GIT_REPO_SORTS)[number];

export interface GitRepoResponse {
  id: UUID;
  created_by: UUID;
  name: string;
  local_path: string;
  default_branch: string;
  remote_url: string | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface GitRepoCreate {
  name: string;
  local_path: string;
  default_branch?: string;
  remote_url?: string | null;
}

/**
 * What `POST /repos` answers with — it connects rather than creates.
 *
 * The endpoint is idempotent by name so a bot can call it unconditionally at
 * startup instead of racing a lookup-then-create. `created` says which happened,
 * so nothing needs to read the status code to tell 201 from 200. Reconnecting
 * refreshes `local_path`, `default_branch` and `remote_url` — the path is
 * per-machine and goes stale the moment the repo is cloned somewhere else.
 */
export interface GitRepoConnected {
  repo: GitRepoResponse;
  created: boolean;
}

export interface GitRepoUpdate {
  name?: string | null;
  local_path?: string | null;
  default_branch?: string | null;
  remote_url?: string | null;
}

export interface ListGitReposParams extends PaginationParams {
  q?: string | null;
  name?: string | null;
  local_path?: string | null;
  remote_url?: string | null;
  sort_by?: GitRepoSort;
  order?: SortOrder;
}

// ---------------------------------------------------------------------------
// API keys
//
// Keys are for machines. One is shown exactly once, at creation, and is never
// recoverable — the UI has to make "copy this now" unmissable.
// ---------------------------------------------------------------------------

export const API_KEY_SCOPES = [
  "executions:read",
  "executions:write",
  "repos:read",
  "repos:write",
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** What an observer bot needs: it writes a transcript and records code. */
export const DEFAULT_API_KEY_SCOPES: readonly ApiKeyScope[] = [
  "executions:read",
  "executions:write",
  "repos:read",
  "repos:write",
];

export interface ApiKeyResponse {
  id: UUID;
  name: string;
  /** The leading, non-secret part — enough to tell two keys apart in a list. */
  prefix: string;
  agent_id: UUID | null;
  scopes: ApiKeyScope[];
  last_used_at: DateTimeString | null;
  expires_at: DateTimeString | null;
  revoked_at: DateTimeString | null;
  created_at: DateTimeString;
}

/** The one response that carries the secret. `key` is never returned again. */
export interface ApiKeyCreated {
  key: string;
  api_key: ApiKeyResponse;
}

export interface ApiKeyCreate {
  name: string;
  agent_id?: UUID | null;
  scopes?: ApiKeyScope[];
  expires_at?: DateTimeString | null;
}

export interface ListApiKeysParams extends PaginationParams {
  agent_id?: UUID | null;
  include_revoked?: boolean;
}

export type ApiKeyState = "active" | "expired" | "revoked";

/**
 * Which of the three states a key is in.
 *
 * Revoked and expired both mean "will not authenticate", but they are not the
 * same event and the list has to tell them apart — one was a decision, the
 * other was a deadline.
 *
 * Reading the clock lives here rather than in a component: `Date.now()` during
 * render is impure, and a component that recomputes it on every re-render can
 * change its own answer underneath itself.
 */
export function apiKeyState(key: ApiKeyResponse): ApiKeyState {
  if (key.revoked_at !== null) return "revoked";
  if (key.expires_at !== null && new Date(key.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

/** True when a key can still authenticate a bot. */
export function isApiKeyActive(key: ApiKeyResponse): boolean {
  return apiKeyState(key) === "active";
}
