"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE, type ActionState } from "@/app/actions/action-state";
import { toDateInput } from "@/lib/format";
import {
  PRIORITIES,
  TASK_STATUSES,
  type LabelResponse,
  type ProjectResponse,
  type TaskResponse,
} from "@/lib/api/types";

import { PRIORITY_LABEL, STATUS_LABEL } from "./badges";
import { FormError, SubmitButton } from "./form-ui";
import { Checkbox, Field, Input, Select, Textarea } from "./ui";

interface TaskFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  task?: TaskResponse;
  /** Omitted when the project is fixed by context (the project detail page). */
  projects?: ProjectResponse[];
  fixedProjectId?: string;
  labels?: LabelResponse[];
  submitLabel: string;
}

export function TaskForm({
  action,
  task,
  projects,
  fixedProjectId,
  labels = [],
  submitLabel,
}: TaskFormProps) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE);
  const isEdit = task !== undefined;

  return (
    <form
      action={formAction}
      key={isEdit ? task.updated_at : state.ok ? "reset" : "new"}
      className="flex flex-col gap-[16px]"
    >
      {isEdit ? <input type="hidden" name="task_id" value={task.id} /> : null}
      {fixedProjectId ? <input type="hidden" name="project_id" value={fixedProjectId} /> : null}

      <FormError message={state.error} />

      <Field label="Name" htmlFor="task-name" error={state.fieldErrors?.name}>
        <Input
          id="task-name"
          name="name"
          required
          defaultValue={task?.name}
          placeholder="Task name"
          invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      {!isEdit && !fixedProjectId && projects ? (
        <Field label="Project" htmlFor="task-project" error={state.fieldErrors?.project_id}>
          <Select
            id="task-project"
            name="project_id"
            required
            defaultValue=""
            invalid={Boolean(state.fieldErrors?.project_id)}
          >
            <option value="" disabled>
              Choose a project…
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Description" htmlFor="task-description" error={state.fieldErrors?.description}>
        <Textarea
          id="task-description"
          name="description"
          rows={2}
          defaultValue={task?.description ?? ""}
          placeholder="Add more detail…"
          invalid={Boolean(state.fieldErrors?.description)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-3">
        <Field label="Priority" htmlFor="task-priority" error={state.fieldErrors?.priority}>
          <Select
            id="task-priority"
            name="priority"
            defaultValue={task?.priority ?? "low"}
            invalid={Boolean(state.fieldErrors?.priority)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="task-status" error={state.fieldErrors?.status}>
          <Select
            id="task-status"
            name="status"
            defaultValue={task?.status ?? "todo"}
            invalid={Boolean(state.fieldErrors?.status)}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Due" htmlFor="task-due" error={state.fieldErrors?.due_date}>
          <Input
            id="task-due"
            name="due_date"
            type="date"
            defaultValue={toDateInput(task?.due_date)}
            invalid={Boolean(state.fieldErrors?.due_date)}
          />
        </Field>
      </div>

      {!isEdit && labels.length > 0 ? (
        <div className="flex flex-col gap-[4px]">
          <span className="pl-[2px] text-small leading-[16px] text-fg-muted">Labels</span>
          <div className="flex flex-wrap items-center gap-[4px]">
            {labels.map((label) => (
              <Checkbox key={label.id} name="label_ids" value={label.id} label={label.name} />
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
