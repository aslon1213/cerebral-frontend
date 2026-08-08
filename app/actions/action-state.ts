import { ApiError, ApiNetworkError } from "@/lib/api/errors";

/**
 * Shared shape for `useActionState` forms.
 *
 * Deliberately not a `"use server"` module: those may only export async
 * functions, so helpers and types live here instead.
 */
export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set after a mutation succeeds, so forms can reset or confirm. */
  ok?: boolean;
}

export const EMPTY_ACTION_STATE: ActionState = {};

/** Map a thrown error onto form state, keeping field errors attached to fields. */
export function toActionState(error: unknown, fallback: string): ActionState {
  if (error instanceof ApiError) {
    if (error.isValidation) {
      const { _: formError, ...fieldErrors } = error.fieldErrors;
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      return {
        error: formError ?? (hasFieldErrors ? "Please correct the errors below." : error.message),
        fieldErrors,
      };
    }
    // 5xx messages are intentionally vague; the request id makes a report useful.
    if (error.isServerError && error.requestId) {
      return { error: `${error.message} (request id: ${error.requestId})` };
    }
    return { error: error.message };
  }
  if (error instanceof ApiNetworkError) return { error: error.message };
  return { error: fallback };
}

/** Read a trimmed string field, or `undefined` when blank. */
export function optionalText(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? undefined : value;
}

/**
 * Convert a `datetime-local` value to the ISO-8601 UTC string the API expects.
 * Returns `null` when cleared, so a PATCH can unset the field.
 */
export function optionalDateTime(formData: FormData, key: string): string | null | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Split a textarea into one entry per non-empty line. */
export function linesToArray(formData: FormData, key: string): string[] {
  return String(formData.get(key) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
