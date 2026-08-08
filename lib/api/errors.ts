import type { ApiErrorPayload, ErrorCode, FieldError } from "./types";

/**
 * Any non-2xx response from the API.
 *
 * Every endpoint answers with the same envelope, errors included:
 *
 * ```json
 * {"ok": false, "data": null,
 *  "error": {"code": "conflict", "message": "A label named 'dup' already exists", "details": null},
 *  "request_id": "27b6324c..."}
 * ```
 *
 * `code` is the stable part of the contract — branch on it. `message` is
 * written for the reader and may be reworded at any time, so show it rather
 * than matching on it.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Stable machine code. `null` only if the body wasn't a valid envelope. */
  readonly code: ErrorCode | null;
  /** Populated for `validation_error`; empty for codes that carry no details. */
  readonly details: FieldError[];
  /** Whatever `error.details` held, unnormalised, for codes we don't model. */
  readonly rawDetails: unknown;
  /** Trace id shared across services — quote it when reporting a problem. */
  readonly requestId: string | null;
  /** Raw parsed body, for anything the normalised fields don't cover. */
  readonly body: unknown;

  constructor(init: {
    status: number;
    message: string;
    code?: ErrorCode | null;
    details?: FieldError[];
    rawDetails?: unknown;
    requestId?: string | null;
    body?: unknown;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code ?? null;
    this.details = init.details ?? [];
    this.rawDetails = init.rawDetails ?? null;
    this.requestId = init.requestId ?? null;
    this.body = init.body;
  }

  get isBadRequest(): boolean {
    return this.status === 400 || this.code === "bad_request";
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === "unauthorized";
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === "forbidden";
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === "not_found";
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code === "conflict";
  }

  get isValidation(): boolean {
    return this.status === 422 || this.code === "validation_error";
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.code === "too_many_requests";
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Field-keyed messages, ready to drop into a form.
   *
   * Errors about the payload as a whole (e.g. "target_date must not be earlier
   * than started_date") are keyed `_`.
   */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const detail of this.details) {
      if (!(detail.field in out)) out[detail.field] = detail.message;
    }
    return out;
  }

  /** The whole-payload message, if the API reported one. */
  get formError(): string | undefined {
    return this.details.find((d) => d.field === "_")?.message;
  }
}

/** Thrown when the request never produced an HTTP response (DNS, refused, abort). */
export class ApiNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiNetworkError";
  }
}

/**
 * A 2xx response that wasn't a readable envelope.
 *
 * Mirrors the backend's own `UnwrapError`: the call succeeded at the HTTP level
 * but the body could not be unwrapped, so there is no payload to return.
 */
export class ApiUnwrapError extends Error {
  readonly body: unknown;
  readonly requestId: string | null;

  constructor(message: string, body: unknown, requestId: string | null = null) {
    super(message);
    this.name = "ApiUnwrapError";
    this.body = body;
    this.requestId = requestId;
  }
}

/**
 * The session could not be authenticated and refreshing did not recover it —
 * callers should send the user back to the login screen.
 */
export class SessionExpiredError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

/**
 * Turn a `field` locator into a form key.
 *
 * The API sends `body.name` for a field and a bare `body` when the complaint is
 * about the payload as a whole; the latter becomes `_`.
 */
function normaliseFieldName(field: string): string {
  const stripped = field.replace(/^(body|query|path|header)\.?/, "");
  return stripped === "" ? "_" : stripped;
}

/** Normalise `error.details` when the code carries field errors. */
function toFieldErrors(details: unknown): FieldError[] {
  if (!Array.isArray(details)) return [];
  const out: FieldError[] = [];
  for (const item of details) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.field !== "string" || typeof record.message !== "string") continue;
    out.push({
      field: normaliseFieldName(record.field),
      message: record.message,
      type: typeof record.type === "string" ? record.type : undefined,
    });
  }
  return out;
}

/** True when `body` looks like the API's response envelope. */
export function isApiResponseEnvelope(
  body: unknown,
): body is { ok: unknown; data: unknown; error: unknown; request_id?: unknown } {
  return (
    body !== null &&
    typeof body === "object" &&
    "ok" in body &&
    "data" in body &&
    "error" in body
  );
}

/** Build an `ApiError` from a parsed error response. */
export function apiErrorFromBody(status: number, body: unknown, fallback: string): ApiError {
  if (body !== null && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const requestId = typeof record.request_id === "string" ? record.request_id : null;
    const envelope = record.error;

    if (envelope !== null && typeof envelope === "object") {
      const error = envelope as Partial<ApiErrorPayload>;
      return new ApiError({
        status,
        message:
          typeof error.message === "string" && error.message !== "" ? error.message : fallback,
        code: typeof error.code === "string" ? (error.code as ErrorCode) : null,
        details: toFieldErrors(error.details),
        rawDetails: error.details,
        requestId,
        body,
      });
    }

    return new ApiError({ status, message: fallback, requestId, body });
  }

  // A gateway or proxy failing in front of the API won't speak the envelope.
  if (typeof body === "string" && body.trim() !== "") {
    return new ApiError({ status, message: body.slice(0, 500), body });
  }

  return new ApiError({ status, message: fallback, body });
}
