import Link from "next/link";

import type {
  ChangeType,
  ExecutionStatus,
  InterventionKind,
  InterventionStatus,
} from "@/lib/api/types";
import { executionPhase } from "@/lib/api/types";
import {
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_SHORT,
  INTERVENTION_KIND_LABEL,
  INTERVENTION_STATUS_LABEL,
} from "@/lib/vocabulary";

import { cx } from "./ui";

/**
 * The vocabulary of a run, drawn the way `badges.tsx` draws a task's.
 *
 * A run has seven statuses but a person reads three: it is alive, it is stuck
 * on them, or it is over. So the glyphs are grouped by phase first — a blocked
 * run is the only one that gets a filled, warm, differently-shaped mark, because
 * it is the only one that is costing someone time.
 */



const EXECUTION_STATUS_COLOR: Record<ExecutionStatus, string> = {
  pending: "text-slate",
  running: "text-yellow",
  waiting_approval: "text-orange",
  waiting_input: "text-orange",
  succeeded: "text-green",
  failed: "text-red",
  cancelled: "text-fg-faint",
};

/**
 * A 14px mark, sized and weighted like `StatusIcon` so the two sit together in
 * a row without one shouting over the other.
 *
 * `waiting_*` is the exception on purpose: a solid disc carrying two pause bars,
 * so it separates from the rings by shape and by fill, not only by hue.
 */
export function ExecutionStatusIcon({ status }: { status: ExecutionStatus }) {
  const color = EXECUTION_STATUS_COLOR[status];

  if (status === "waiting_approval" || status === "waiting_input") {
    return (
      <span
        aria-hidden="true"
        className={cx(
          "inline-flex size-[14px] shrink-0 items-center justify-center gap-[2px] rounded-full",
          "bg-current",
          color,
        )}
      >
        <span className="h-[6px] w-[1.5px] rounded-full bg-app" />
        <span className="h-[6px] w-[1.5px] rounded-full bg-app" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex size-[14px] shrink-0 rounded-full border-[1.5px] border-current",
        color,
      )}
    >
      {/* Running fills half the ring and turns, so a live run reads as live at
          a glance rather than only in the word beside it. */}
      {status === "running" ? (
        <span
          className="absolute inset-[2px] animate-spin rounded-full [animation-duration:2.4s]"
          style={{
            background: "conic-gradient(currentColor 0deg 140deg, transparent 140deg)",
          }}
        />
      ) : null}
      {status === "succeeded" ? (
        <span className="absolute inset-[2px] rounded-full bg-current" />
      ) : null}
      {status === "failed" ? (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] leading-none font-bold">
          ×
        </span>
      ) : null}
      {status === "cancelled" ? (
        <span className="absolute inset-x-[2px] top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
      ) : null}
    </span>
  );
}

export function ExecutionStatusBadge({
  status,
  short = false,
}: {
  status: ExecutionStatus;
  short?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[6px] text-small",
        executionPhase(status) === "blocked" ? "text-orange" : "text-fg-muted",
      )}
    >
      <ExecutionStatusIcon status={status} />
      {short ? EXECUTION_STATUS_SHORT[status] : EXECUTION_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * How a task has been run, compressed to one glyph and a number.
 *
 * A task list is not a run list, so this says only what a glance needs: how many
 * times an agent has attempted this, and where the newest attempt stands. The
 * full story is one click away.
 *
 * When a run is blocked the glyph is the blocked one rather than the newest
 * status — a task with something waiting on a human should read that way even
 * if a later attempt is happily running.
 */
export function RunSummary({
  count,
  latestStatus,
  blocked,
  href,
  title,
}: {
  count: number;
  latestStatus: ExecutionStatus;
  blocked: number;
  href: string;
  title: string;
}) {
  const status = blocked > 0 ? "waiting_approval" : latestStatus;

  return (
    <Link
      href={href}
      title={title}
      className={cx(
        "inline-flex shrink-0 items-center gap-[6px] rounded-control px-[6px] py-[2px]",
        "text-mini leading-[16px] no-underline transition-colors duration-100",
        "hover:bg-overlay-hover",
        blocked > 0 ? "text-orange" : "text-fg-subtle hover:text-fg",
      )}
    >
      <ExecutionStatusIcon status={status} />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}

/**
 * The retry number, shown only when there has been one.
 *
 * "attempt 1" on every row is noise; "attempt 3" is the whole story.
 */
export function AttemptBadge({ attempt }: { attempt: number }) {
  if (attempt <= 1) return null;
  return (
    <span
      title={`Attempt ${attempt} at this task`}
      className="inline-flex shrink-0 items-center rounded-full border border-line-strong px-[7px] py-[1px] text-micro leading-[16px] text-fg-subtle"
    >
      attempt {attempt}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------



const INTERVENTION_KIND_COLOR: Record<InterventionKind, string> = {
  approval: "border-orange/45 bg-orange/12 text-orange",
  qa_review: "border-purple/45 bg-purple/12 text-purple",
  input_required: "border-blue/45 bg-blue/12 text-blue",
};

export function InterventionKindBadge({ kind }: { kind: InterventionKind }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-full border px-[9px] py-[2px] text-micro leading-[16px] font-medium",
        INTERVENTION_KIND_COLOR[kind],
      )}
    >
      {INTERVENTION_KIND_LABEL[kind]}
    </span>
  );
}


const INTERVENTION_STATUS_COLOR: Record<InterventionStatus, string> = {
  pending: "text-orange",
  approved: "text-green",
  rejected: "text-red",
  answered: "text-blue",
  expired: "text-fg-faint",
};

export function InterventionStatusBadge({ status }: { status: InterventionStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[5px] text-mini leading-[16px]",
        INTERVENTION_STATUS_COLOR[status],
      )}
    >
      <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-current" />
      {INTERVENTION_STATUS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Transcript and code
// ---------------------------------------------------------------------------




const CHANGE_TYPE_COLOR: Record<ChangeType, string> = {
  created: "text-green",
  modified: "text-yellow",
  deleted: "text-red",
  renamed: "text-blue",
};

/** A single letter in the git tradition: A/M/D/R. */
export function ChangeTypeGlyph({ type }: { type: ChangeType }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex size-[16px] shrink-0 items-center justify-center rounded-[3px]",
        "border border-current/40 text-micro leading-none font-semibold",
        CHANGE_TYPE_COLOR[type],
      )}
    >
      {type.charAt(0).toUpperCase()}
    </span>
  );
}

/** `+18 −47`, the shape every diff stat is read in. */
export function DiffStat({ added, deleted }: { added: number; deleted: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-[6px] font-mono text-mini leading-[16px]">
      <span className="text-green">+{added}</span>
      <span className="text-red">−{deleted}</span>
    </span>
  );
}

/**
 * A commit id, cut to the seven characters everyone actually reads.
 *
 * `title` carries the whole thing so it can still be copied in full.
 */
export function CommitSha({
  sha,
  label,
  className,
}: {
  sha: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      title={label ? `${label}: ${sha}` : sha}
      className={cx("font-mono text-mini leading-[16px] text-fg-subtle", className)}
    >
      {sha.slice(0, 7)}
    </span>
  );
}

/**
 * Whether a change reached the default branch.
 *
 * Agents commit under `refs/cerebral/executions/<id>`, outside `refs/heads/*`,
 * so an unlanded change is invisible to every normal git tool. That is worth
 * saying on the row rather than leaving as an absence.
 */
export function LandedBadge({ sha }: { sha: string | null }) {
  if (sha === null) {
    return (
      <span
        title="Committed in the agent's own ref namespace, not yet on the default branch — normal git tooling cannot see it."
        className="inline-flex shrink-0 items-center gap-[5px] rounded-full border border-line-strong px-[8px] py-[1px] text-micro leading-[16px] text-fg-subtle"
      >
        <span aria-hidden="true" className="size-[5px] rounded-full bg-fg-faint" />
        not landed
      </span>
    );
  }

  return (
    <span
      title={`Landed on the default branch as ${sha}`}
      className="inline-flex shrink-0 items-center gap-[5px] rounded-full border border-green/40 bg-green/10 px-[8px] py-[1px] text-micro leading-[16px] text-green"
    >
      <span aria-hidden="true" className="size-[5px] rounded-full bg-current" />
      landed
    </span>
  );
}

/*
  The display strings live in `lib/vocabulary` so Server Actions can reach them
  without importing a component module. They are re-exported here because most
  callers want the glyph and the word together.
*/
export {
  ACTOR_LABEL,
  CHANGE_TYPE_LABEL,
  EVENT_TYPE_LABEL,
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_SHORT,
  INTERVENTION_KIND_BLURB,
  INTERVENTION_KIND_LABEL,
  INTERVENTION_STATUS_LABEL,
} from "@/lib/vocabulary";
