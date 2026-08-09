"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE, type ActionState } from "@/app/actions/action-state";
import type { AgentResponse } from "@/lib/api/types";

import { FormError, SubmitButton } from "./form-ui";
import { Field, Input } from "./ui";

export function AgentForm({
  action,
  agent,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  agent?: AgentResponse;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const isEdit = agent !== undefined;
  const idPrefix = isEdit ? `agent-${agent.id}` : "agent-new";

  return (
    <form
      action={formAction}
      key={isEdit ? agent.updated_at : state.ok ? "reset" : "new"}
      className="flex flex-col gap-[16px]"
    >
      {isEdit ? <input type="hidden" name="agent_id" value={agent.id} /> : null}

      <FormError message={state.error} />

      <div className="flex w-full flex-col gap-[16px] sm:flex-row sm:items-end">
        <Field
          label="Name"
          htmlFor={`${idPrefix}-name`}
          error={state.fieldErrors?.name}
          hint={isEdit ? undefined : "How the observer bot will identify itself."}
          className="sm:w-1/4"
        >
          <Input
            id={`${idPrefix}-name`}
            name="name"
            required
            defaultValue={agent?.name}
            placeholder="nightly-refactor"
            invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Description"
          htmlFor={`${idPrefix}-description`}
          error={state.fieldErrors?.description}
          className="sm:flex-1"
        >
          <Input
            id={`${idPrefix}-description`}
            name="description"
            defaultValue={agent?.description ?? ""}
            placeholder="Optional"
            invalid={Boolean(state.fieldErrors?.description)}
          />
        </Field>

        <Field
          label="Default model"
          htmlFor={`${idPrefix}-model`}
          error={state.fieldErrors?.default_model}
          className="sm:w-[180px]"
        >
          <Input
            id={`${idPrefix}-model`}
            name="default_model"
            defaultValue={agent?.default_model ?? ""}
            placeholder="claude-opus-5"
            invalid={Boolean(state.fieldErrors?.default_model)}
          />
        </Field>

        <div className="flex shrink-0">
          <SubmitButton variant={isEdit ? "secondary" : "primary"} size="large">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
