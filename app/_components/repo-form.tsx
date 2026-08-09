"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE } from "@/app/actions/action-state";
import type { RepoFormState } from "@/app/actions/repos";
import type { GitRepoResponse } from "@/lib/api/types";

import { FormError, SubmitButton } from "./form-ui";
import { Banner, Field, Input } from "./ui";

export function RepoForm({
  action,
  repo,
  submitLabel,
}: {
  action: (state: RepoFormState, formData: FormData) => Promise<RepoFormState>;
  repo?: GitRepoResponse;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE as RepoFormState);
  const isEdit = repo !== undefined;
  const idPrefix = isEdit ? `repo-${repo.id}` : "repo-new";

  return (
    <form
      action={formAction}
      key={isEdit ? repo.updated_at : state.ok ? "reset" : "new"}
      className="flex flex-col gap-[16px]"
    >
      {isEdit ? <input type="hidden" name="repo_id" value={repo.id} /> : null}

      <FormError message={state.error} />

      {/*
        Connecting is idempotent by name, so a repeated name updates rather than
        failing. Silently is the wrong way to do that — someone who expected a
        new repo needs to know they edited an existing one.
      */}
      {state.reconnected ? (
        <Banner tone="info" heading="Reconnected an existing repo">
          A repo with that name was already registered, so its path and default
          branch were updated instead of a second one being added.
        </Banner>
      ) : null}

      <div className="flex flex-col gap-[16px] sm:flex-row sm:items-start">
        <Field
          label="Name"
          htmlFor={`${idPrefix}-name`}
          error={state.fieldErrors?.name}
          className="sm:w-1/4"
        >
          <Input
            id={`${idPrefix}-name`}
            name="name"
            required
            defaultValue={repo?.name}
            placeholder="cerebral-api"
            invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Local path"
          htmlFor={`${idPrefix}-local-path`}
          error={state.fieldErrors?.local_path}
          hint="Where the checkout lives on the machine the agent runs on."
          className="sm:flex-1"
        >
          <Input
            id={`${idPrefix}-local-path`}
            name="local_path"
            required
            defaultValue={repo?.local_path}
            placeholder="/srv/repos/cerebral-api"
            invalid={Boolean(state.fieldErrors?.local_path)}
          />
        </Field>

        <Field
          label="Default branch"
          htmlFor={`${idPrefix}-branch`}
          error={state.fieldErrors?.default_branch}
          className="sm:w-[140px]"
        >
          <Input
            id={`${idPrefix}-branch`}
            name="default_branch"
            defaultValue={repo?.default_branch ?? "main"}
            placeholder="main"
            invalid={Boolean(state.fieldErrors?.default_branch)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-[16px] sm:flex-row sm:items-end">
        <Field
          label="Remote URL"
          htmlFor={`${idPrefix}-remote`}
          error={state.fieldErrors?.remote_url}
          className="sm:flex-1"
        >
          <Input
            id={`${idPrefix}-remote`}
            name="remote_url"
            defaultValue={repo?.remote_url ?? ""}
            placeholder="git@github.com:acme/cerebral-api.git (optional)"
            invalid={Boolean(state.fieldErrors?.remote_url)}
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
