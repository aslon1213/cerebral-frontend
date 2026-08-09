"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";

import { optionalText, toActionState, type ActionState } from "./action-state";

/**
 * Answering what an agent is blocked on.
 *
 * The person answers; the agent asks. Opening an intervention is on the ingest
 * path and belongs to the observer bot.
 */

export interface ResolveState extends ActionState {
  /** Set when the API says someone already dealt with this one. */
  stale?: boolean;
}

/**
 * Where to land once it is resolved, carrying enough to report the outcome.
 *
 * The redirect is what makes the outcome visible at all. A Server Action
 * re-renders the route it was called from, and the item is no longer pending by
 * then — so its card is gone before any state it returned could be shown.
 * Handing the next request the run id and the verb lets the page read back what
 * actually happened and say so.
 */
function resolvedUrl(formData: FormData, executionId: string, verb: string): string {
  const raw = String(formData.get("return_to") ?? "/inbox");
  // Same-origin only: this value reaches `redirect` and Server Actions are
  // reachable by direct POST.
  const base = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/inbox";
  const [path] = base.split("?");
  return `${path}?resolved=${encodeURIComponent(executionId)}&verb=${verb}`;
}

function revalidateAfterResolve(executionId: string) {
  revalidatePath("/inbox");
  revalidatePath("/runs");
  revalidatePath(`/runs/${executionId}`);
}

/**
 * Approve or reject — `approval` and `qa_review` only.
 *
 * Both verbs share this action and one form: the decision rides in on the
 * button that was pressed, so the note the user typed applies to whichever they
 * chose without duplicating the textarea.
 */
export async function decideInterventionAction(
  _prevState: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const interventionId = String(formData.get("intervention_id") ?? "");
  const executionId = String(formData.get("execution_id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!interventionId) return { error: "Missing intervention id." };
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Missing decision." };
  }

  const reasoning = optionalText(formData, "reasoning") ?? null;

  try {
    if (decision === "approve") {
      await api.interventions.approve(interventionId, { reasoning });
    } else {
      await api.interventions.reject(interventionId, { reasoning });
    }
  } catch (error) {
    return toResolveState(error, "Could not record that decision.");
  }

  revalidateAfterResolve(executionId);
  // `redirect` throws internally, so it must sit outside the try/catch.
  redirect(resolvedUrl(formData, executionId, decision));
}

/**
 * Answer a question — `input_required` only.
 *
 * `response` is required by the API, which is right: answering a question with
 * nothing is the one thing that makes no sense.
 */
export async function answerInterventionAction(
  _prevState: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const interventionId = String(formData.get("intervention_id") ?? "");
  const executionId = String(formData.get("execution_id") ?? "");
  if (!interventionId) return { error: "Missing intervention id." };

  // A picked option wins over the free-text box; the box is what is there when
  // the agent offered no options, or none of them fit.
  const choice = optionalText(formData, "choice");
  const text = optionalText(formData, "answer");
  const answer = choice ?? text;

  if (!answer) {
    return {
      fieldErrors: { answer: "The agent is waiting on this — an answer is required." },
    };
  }

  try {
    await api.interventions.answer(interventionId, {
      // The agent decides the shape of `response`, and there is no way from
      // here to know what it expects. `answer` is the plainest key that says
      // what the value is; the note goes in `reasoning`, which is typed.
      response: { answer },
      reasoning: optionalText(formData, "reasoning") ?? null,
    });
  } catch (error) {
    return toResolveState(error, "Could not send that answer.");
  }

  revalidateAfterResolve(executionId);
  redirect(resolvedUrl(formData, executionId, "answer"));
}

/**
 * Map the two conflicts this screen can actually produce.
 *
 * `intervention_already_resolved` is very likely a second tab rather than a
 * mistake, so it is reported as staleness to be refreshed away, not as an
 * error. `intervention_kind_mismatch` should be unreachable — the controls are
 * chosen by kind — so if it appears the UI is out of step with the record and
 * refetching is again the fix.
 */
function toResolveState(error: unknown, fallback: string): ResolveState {
  if (error instanceof ApiError) {
    if (
      error.code === "intervention_already_resolved" ||
      error.code === "intervention_kind_mismatch"
    ) {
      return { stale: true, error: error.message };
    }
  }
  return toActionState(error, fallback);
}
