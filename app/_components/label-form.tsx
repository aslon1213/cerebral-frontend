"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE, type ActionState } from "@/app/actions/action-state";
import type { LabelResponse } from "@/lib/api/types";

import { FormError, SubmitButton } from "./form-ui";
import { Field, Input } from "./ui";

interface LabelFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label?: LabelResponse;
  submitLabel: string;
}

export function LabelForm({ action, label, submitLabel }: LabelFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const isEdit = label !== undefined;
  // Ids have to stay unique across the several edit forms a page can render.
  const idPrefix = isEdit ? `label-${label.id}` : "label-new";

  return (
    <form
      action={formAction}
      key={isEdit ? label.updated_at : state.ok ? "reset" : "new"}
      className="flex flex-col gap-[16px]"
    >
      {isEdit ? <input type="hidden" name="label_id" value={label.id} /> : null}

      <FormError message={state.error} />

      {/* Name, description and the action sit on one row, bottom-aligned. */}
      <div className="flex flex-col gap-[16px] sm:flex-row sm:items-end">
        <Field
          label="Name"
          htmlFor={`${idPrefix}-name`}
          error={state.fieldErrors?.name}
          className="sm:w-1/3"
        >
          <Input
            id={`${idPrefix}-name`}
            name="name"
            required
            maxLength={64}
            defaultValue={label?.name}
            placeholder="Label name"
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
            maxLength={500}
            defaultValue={label?.description ?? ""}
            placeholder="Optional"
            invalid={Boolean(state.fieldErrors?.description)}
          />
        </Field>

        <div className="flex shrink-0">
          {/*
            `large` matches the height of the comfortable-density fields it sits
            beside, so the row lands on one baseline instead of stepping.
          */}
          <SubmitButton variant={isEdit ? "secondary" : "primary"} size="large">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
