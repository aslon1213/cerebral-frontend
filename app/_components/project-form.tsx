"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE, type ActionState } from "@/app/actions/action-state";
import { toDateInput } from "@/lib/format";
import { PRIORITIES, type LabelResponse, type ProjectResponse } from "@/lib/api/types";

import { PRIORITY_LABEL } from "./badges";
import { FormError, SubmitButton } from "./form-ui";
import { Checkbox, Field, Input, Select, Textarea } from "./ui";

interface ProjectFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Present when editing; omitted when creating. */
  project?: ProjectResponse;
  labels?: LabelResponse[];
  submitLabel: string;
}

export function ProjectForm({ action, project, labels = [], submitLabel }: ProjectFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const isEdit = project !== undefined;

  return (
    <form
      action={formAction}
      // Remounting on success clears the inputs after a create.
      key={isEdit ? project.updated_at : state.ok ? "reset" : "new"}
      className="flex flex-col gap-[16px]"
    >
      {isEdit ? <input type="hidden" name="project_id" value={project.id} /> : null}

      <FormError message={state.error} />

      <Field label="Name" htmlFor="project-name" error={state.fieldErrors?.name}>
        <Input
          id="project-name"
          name="name"
          required
          defaultValue={project?.name}
          placeholder="Project name"
          invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="project-description"
        error={state.fieldErrors?.description}
      >
        <Textarea
          id="project-description"
          name="description"
          rows={2}
          defaultValue={project?.description ?? ""}
          placeholder="What is this project about?"
          invalid={Boolean(state.fieldErrors?.description)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-3">
        <Field label="Priority" htmlFor="project-priority" error={state.fieldErrors?.priority}>
          <Select
            id="project-priority"
            name="priority"
            defaultValue={project?.priority ?? "low"}
            invalid={Boolean(state.fieldErrors?.priority)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Start" htmlFor="project-start" error={state.fieldErrors?.started_date}>
          <Input
            id="project-start"
            name="started_date"
            type="date"
            defaultValue={toDateInput(project?.started_date)}
            invalid={Boolean(state.fieldErrors?.started_date)}
          />
        </Field>

        <Field label="Target" htmlFor="project-target" error={state.fieldErrors?.target_date}>
          <Input
            id="project-target"
            name="target_date"
            type="date"
            defaultValue={toDateInput(project?.target_date)}
            invalid={Boolean(state.fieldErrors?.target_date)}
          />
        </Field>
      </div>

      <Field
        label="Goals"
        htmlFor="project-goals"
        hint="One per line"
        error={state.fieldErrors?.goals}
      >
        <Textarea
          id="project-goals"
          name="goals"
          rows={2}
          defaultValue={project?.goals.join("\n") ?? ""}
          invalid={Boolean(state.fieldErrors?.goals)}
        />
      </Field>

      {!isEdit && labels.length > 0 ? (
        <div className="flex flex-col gap-[4px]">
          <span className="pl-[2px] text-small leading-[16px] text-fg-muted">Labels</span>
          <div className="flex flex-wrap items-center gap-[4px]">
            {labels.map((label) => (
              <Checkbox
                key={label.id}
                name="label_ids"
                value={label.id}
                label={label.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
