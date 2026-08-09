"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import {
  answerInterventionAction,
  decideInterventionAction,
  type ResolveState,
} from "@/app/actions/interventions";
import { formatElapsed, formatExact } from "@/lib/format";
import type { InterventionResponse } from "@/lib/api/types";
import { INTERVENTION_KIND_BLURB } from "@/lib/vocabulary";

import { SubmitButton } from "./form-ui";
import { JsonView } from "./json-view";
import { ClockIcon } from "./icons";
import { InterventionKindBadge } from "./run-badges";
import { Banner, Button, Card, Field, Input, Select, TextLink, Textarea, cx } from "./ui";

const EMPTY: ResolveState = {};

/**
 * One thing an agent is stuck on, answerable without leaving the inbox.
 *
 * The kind decides the controls, and nothing offers a verb the API would
 * refuse: approving a question is `409 intervention_kind_mismatch`, so a
 * question is never given an Approve button in the first place.
 */
export function InterventionCard({
  intervention,
  context,
  returnTo = "/inbox",
}: {
  intervention: InterventionResponse;
  /** Where this came from — the run, and the task it is an attempt at. */
  context?: { taskName?: string; projectName?: string; attempt?: number };
  /** Where to land after resolving, so a run page stays on the run. */
  returnTo?: string;
}) {
  const isQuestion = intervention.kind === "input_required";

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] border-b border-line px-[16px] py-[11px]">
        <InterventionKindBadge kind={intervention.kind} />
        <p className="min-w-0 text-small text-fg-muted">
          The agent {INTERVENTION_KIND_BLURB[intervention.kind]}.
        </p>

        {/*
          How long it has been stuck is the number this screen is about, so it
          is the one thing here drawn in the blocked colour.
        */}
        <span
          title={`Asked ${formatExact(intervention.created_at)}`}
          className="ml-auto inline-flex shrink-0 items-center gap-[5px] text-mini leading-[16px] text-orange"
        >
          <ClockIcon size={13} />
          blocked {formatElapsed(intervention.created_at)}
        </span>
      </header>

      <div className="flex flex-col gap-[12px] px-[16px] py-[13px]">
        {context?.taskName ? (
          <p className="text-mini leading-[16px] text-fg-subtle">
            {context.projectName ? `${context.projectName} · ` : null}
            <TextLink
              href={`/runs/${intervention.execution_id}`}
              className="text-fg-muted underline decoration-line-input underline-offset-2"
            >
              {context.taskName}
            </TextLink>
            {context.attempt && context.attempt > 1 ? ` · attempt ${context.attempt}` : null}
          </p>
        ) : null}

        {/* The agent decides this shape, so it is rendered structurally rather
            than against any expected schema. */}
        <JsonView data={intervention.request} />

        <ResolveForm
          intervention={intervention}
          isQuestion={isQuestion}
          returnTo={returnTo}
        />
      </div>
    </Card>
  );
}

function ResolveForm({
  intervention,
  isQuestion,
  returnTo,
}: {
  intervention: InterventionResponse;
  isQuestion: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    isQuestion ? answerInterventionAction : decideInterventionAction,
    EMPTY,
  );

  /*
    There is no success branch here on purpose. A resolved intervention is no
    longer pending, so the Server Action's re-render of this route drops it from
    the list and unmounts this card — anything it tried to say about the outcome
    would go with it. The action redirects instead, and the page reports what
    became of the run on the next request.
  */
  if (state.stale) {
    return (
      <div className="flex flex-wrap items-center gap-[12px] rounded-input border border-line-strong bg-surface-sunken px-[13px] py-[10px]">
        <p className="min-w-0 flex-1 text-small text-fg-muted">
          {state.error} This usually means it was dealt with in another tab.
        </p>
        <Button size="small" variant="secondary" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-[10px]">
      <input type="hidden" name="intervention_id" value={intervention.id} />
      <input type="hidden" name="execution_id" value={intervention.execution_id} />
      <input type="hidden" name="return_to" value={returnTo} />

      {state.error ? <Banner tone="critical">{state.error}</Banner> : null}

      {isQuestion ? (
        <QuestionControls request={intervention.request} error={state.fieldErrors?.answer} />
      ) : (
        <DecisionControls />
      )}
    </form>
  );
}

/** Approve / reject, with one optional note that applies to either. */
function DecisionControls() {
  return (
    <div className="flex flex-wrap items-end gap-[10px]">
      <Input
        name="reasoning"
        density="compact"
        placeholder="Add a note for the agent (optional)"
        aria-label="Note for the agent"
        className="min-w-[200px] flex-1"
      />
      {/*
        Both buttons submit the same form; `name`/`value` on the button is what
        tells the action which verb was pressed, so the note is written once.
      */}
      <div className="flex shrink-0 items-center gap-[8px]">
        <SubmitButton name="decision" value="reject" variant="secondary" destructive>
          Reject
        </SubmitButton>
        <SubmitButton name="decision" value="approve">
          Approve
        </SubmitButton>
      </div>
    </div>
  );
}

/**
 * Answering a question.
 *
 * If the agent happened to offer `options`, they are presented as a picker —
 * but the free-text box is always there, because the shape of `request` is the
 * agent's to choose and this is a convenience, not a contract. Nothing breaks
 * when `options` is absent, a different type, or named something else.
 */
function QuestionControls({
  request,
  error,
}: {
  request: Record<string, unknown>;
  error?: string;
}) {
  const raw = request.options;
  const options =
    Array.isArray(raw) && raw.length > 0 && raw.every((item) => typeof item === "string")
      ? (raw as string[])
      : null;

  return (
    <div className="flex flex-col gap-[10px]">
      {options ? (
        <Field label="Pick one of the answers the agent offered" htmlFor="choice">
          <Select id="choice" name="choice" density="compact" defaultValue="">
            <option value="">Write my own answer…</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field
        label={options ? "…or answer in your own words" : "Your answer"}
        htmlFor="answer"
        error={error}
      >
        <Textarea
          id="answer"
          name="answer"
          rows={3}
          density="compact"
          placeholder="The agent cannot continue until this is answered."
          aria-invalid={error ? true : undefined}
          invalid={Boolean(error)}
        />
      </Field>

      <div className={cx("flex items-center justify-end gap-[8px]")}>
        <SubmitButton>Send answer</SubmitButton>
      </div>
    </div>
  );
}
