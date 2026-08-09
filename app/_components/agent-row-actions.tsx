"use client";

import { useActionState } from "react";

import { EMPTY_ACTION_STATE } from "@/app/actions/action-state";
import { deleteAgentAction } from "@/app/actions/agents";

import { SubmitButton } from "./form-ui";
import { TrashIcon } from "./icons";
import { Banner } from "./ui";

/**
 * Deleting an agent, which usually is not allowed.
 *
 * `409 resource_in_use` is the expected answer once any run has been executed
 * by this agent — a run is an audit record and cannot be left pointing at
 * nothing. That refusal needs a sentence to explain, and a sentence needs room,
 * which is why this lives in the agent's edit panel rather than as a hover
 * action on its row: the list clips its own overflow, so a popover there would
 * be cut off exactly when it had something to say.
 */
export function DeleteAgent({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [state, action] = useActionState(deleteAgentAction, EMPTY_ACTION_STATE);

  return (
    <div className="flex flex-col gap-[10px] border-t border-line pt-[14px]">
      {state.error ? <Banner tone="critical">{state.error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <p className="text-mini leading-[16px] text-fg-faint">
          Deleting only works while no run has been attributed to this agent.
        </p>
        <form action={action}>
          <input type="hidden" name="agent_id" value={agentId} />
          <SubmitButton variant="secondary" size="small" destructive>
            <TrashIcon size={13} />
            Delete {agentName}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
