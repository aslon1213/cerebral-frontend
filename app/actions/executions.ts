"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import type {
  CodeChangeResponse,
  ExecutionEventResponse,
  ExecutionStatus,
} from "@/lib/api/types";

import { toActionState, type ActionState } from "./action-state";

/**
 * The two things a person may do to a run: read its transcript, and delete it.
 *
 * Everything else — starting, completing, failing, cancelling, appending events
 * — is driven by the runner and is API-key-only at the server.
 */

// ---------------------------------------------------------------------------
// Tailing the transcript
// ---------------------------------------------------------------------------

export interface TranscriptChunk {
  events: ExecutionEventResponse[];
  /** Feed straight back as `after_seq` next time. */
  nextAfterSeq: number | null;
  hasMore: boolean;
  /** So a poller can stop itself once the run can produce nothing more. */
  status: ExecutionStatus;
  /** Changes for the whole run, re-read so newly arrived events can show theirs. */
  changes: CodeChangeResponse[];
}

/**
 * Read the next slice of a run's transcript.
 *
 * This is the cursor half of §3: `after_seq` is a position in the run's own
 * `seq` sequence, not an offset, so events arriving while someone reads cannot
 * make a page skip or repeat. An empty `events` means caught up.
 *
 * Called both to page back through a long transcript and to tail a live one.
 */
export async function fetchTranscriptAction(
  executionId: string,
  afterSeq: number,
  limit = 100,
): Promise<TranscriptChunk> {
  const [page, execution] = await Promise.all([
    api.executions.events(executionId, { after_seq: afterSeq, limit }),
    api.executions.get(executionId),
  ]);

  // Code changes hang off events but are not inlined on them by the list
  // endpoint. Fetching the run's changes in one request beats expanding each
  // event individually, which would be a request per code_change.
  const changes =
    page.items.length > 0
      ? (await api.executions.changes(executionId, { limit: 200 })).items
      : [];

  return {
    events: page.items,
    nextAfterSeq: page.next_after_seq,
    hasMore: page.has_more,
    status: execution.status,
    changes,
  };
}

// ---------------------------------------------------------------------------
// Deleting a run
// ---------------------------------------------------------------------------

export interface DeleteRunState extends ActionState {
  /**
   * Set when the API refused because the run recorded something. Deleting it
   * anyway means destroying that record, so the second attempt has to be a
   * separate, deliberate act rather than a retry.
   */
  needsPurge?: boolean;
}

export async function deleteExecutionAction(
  _prevState: DeleteRunState,
  formData: FormData,
): Promise<DeleteRunState> {
  const executionId = String(formData.get("execution_id") ?? "");
  if (!executionId) return { error: "Missing run id." };

  const purge = formData.get("purge") === "true";

  try {
    await api.executions.remove(executionId, { purge });
  } catch (error) {
    if (error instanceof ApiError && error.code === "history_exists") {
      return { needsPurge: true, error: error.message };
    }
    return toActionState(error, "Could not delete this run.");
  }

  revalidatePath("/runs");
  revalidatePath("/inbox");
  redirect("/runs");
}
