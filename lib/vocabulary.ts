import type {
  ActorType,
  ChangeType,
  ExecutionEventType,
  ExecutionStatus,
  InterventionKind,
  InterventionStatus,
} from "./api/types";

/**
 * The API's enums said in English.
 *
 * These live in `lib/` rather than beside the badges that draw them because
 * Server Actions need them too — an action that reports "the run is now waiting
 * for input" should not have to import a component module to say so.
 */

export const EXECUTION_STATUS_LABEL: Record<ExecutionStatus, string> = {
  pending: "Pending",
  running: "Running",
  waiting_approval: "Waiting for approval",
  waiting_input: "Waiting for input",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Short enough for a list row, where a group header has said the rest. */
export const EXECUTION_STATUS_SHORT: Record<ExecutionStatus, string> = {
  pending: "Pending",
  running: "Running",
  waiting_approval: "Approval",
  waiting_input: "Input",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const INTERVENTION_KIND_LABEL: Record<InterventionKind, string> = {
  approval: "Approval",
  qa_review: "QA review",
  input_required: "Question",
};

/** What the agent is actually waiting for, as the tail of a sentence. */
export const INTERVENTION_KIND_BLURB: Record<InterventionKind, string> = {
  approval: "wants permission before going ahead",
  qa_review: "wants its work reviewed",
  input_required: "asked a question and cannot continue without an answer",
};

export const INTERVENTION_STATUS_LABEL: Record<InterventionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  answered: "Answered",
  expired: "Expired",
};

export const EVENT_TYPE_LABEL: Record<ExecutionEventType, string> = {
  chat_message: "Message",
  reasoning: "Reasoning",
  decision: "Decision",
  tool_call: "Tool call",
  tool_result: "Result",
  code_change: "Code change",
  status_change: "Status",
  intervention_requested: "Asked for a human",
  intervention_resolved: "Human answered",
  memory_loaded: "Memory loaded",
  memory_saved: "Memory saved",
};

export const ACTOR_LABEL: Record<ActorType, string> = {
  agent: "Agent",
  user: "You",
  system: "System",
};

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  created: "added",
  modified: "modified",
  deleted: "deleted",
  renamed: "renamed",
};
