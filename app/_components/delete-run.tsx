"use client";

import { useActionState } from "react";

import { deleteExecutionAction, type DeleteRunState } from "@/app/actions/executions";

import { SubmitButton } from "./form-ui";
import { TrashIcon } from "./icons";
import { Banner } from "./ui";

const EMPTY: DeleteRunState = {};

/**
 * Deleting a run, in two deliberate steps.
 *
 * The API refuses with `409 history_exists` when the run recorded anything, and
 * only `?purge=true` overrides that. Rather than sending `purge` on the first
 * press and papering over the refusal, the refusal *is* the confirmation: the
 * first press asks, the API says what would be destroyed, and only then is a
 * second, differently-worded button offered.
 *
 * That destroys an audit record and cannot be undone, which is exactly the kind
 * of thing that should not happen on one click.
 */
export function DeleteRun({ executionId }: { executionId: string }) {
  const [state, action] = useActionState(deleteExecutionAction, EMPTY);

  if (state.needsPurge) {
    return (
      <div className="flex flex-col gap-[10px]">
        {/*
          The API's own message says what would be dropped, so repeating it here
          would be noise. What it does not say — because it is a product
          decision, not an API one — is that this is an audit record and there is
          no way back.
        */}
        <Banner tone="critical" heading="This run has a history">
          {state.error} This cannot be undone.
        </Banner>
        <form action={action} className="flex justify-end">
          <input type="hidden" name="execution_id" value={executionId} />
          <input type="hidden" name="purge" value="true" />
          <SubmitButton variant="primary" size="small" destructive>
            Delete the run and its history
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {state.error ? <Banner tone="critical">{state.error}</Banner> : null}
      <form action={action}>
        <input type="hidden" name="execution_id" value={executionId} />
        <SubmitButton variant="tertiary" size="small" destructive className="w-full">
          <TrashIcon size={13} />
          Delete run
        </SubmitButton>
      </form>
    </div>
  );
}
