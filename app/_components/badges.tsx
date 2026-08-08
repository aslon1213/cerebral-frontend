import type { LabelResponse, Priority, TaskStatus } from "@/lib/api/types";

import { cx } from "./ui";

/**
 * Status and priority indicators.
 *
 * Linear shows both as glyphs rather than words: priority is a bar chart that
 * fills up with urgency, status is a progress ring that fills as work moves
 * along. Both are plain geometry, so they are drawn with borders and gradients
 * and take their colour from the `decoration/*` palette.
 */

/*
  Written out rather than produced with a `capitalize` class: that class is set
  on the <select> itself, so it also title-cases the "Any priority" placeholder
  sitting in the same box.
*/
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-slate", // decoration/grey
  medium: "text-yellow", // decoration/yellow
  high: "text-orange", // decoration/orange
  urgent: "text-red", // decoration/red
};

/*
  Only three of the four priorities are bars. `urgent` used to fill all three —
  the same as `high` — which left the two most consequential levels separated by
  nothing but a hue, and told anyone who cannot pick orange from red that they
  were identical. Urgent gets the library's other glyph instead: a filled tile
  carrying an exclamation, so it differs in shape before it differs in colour.
*/
const PRIORITY_FILLED: Record<Exclude<Priority, "urgent">, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function PriorityIcon({ priority }: { priority: Priority }) {
  if (priority === "urgent") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-[16px] shrink-0 items-center justify-center"
      >
        <span className="flex size-[13px] flex-col items-center justify-center gap-[1.5px] rounded-[3px] bg-red">
          <span className="h-[5px] w-[1.5px] rounded-full bg-white" />
          <span className="size-[1.5px] rounded-full bg-white" />
        </span>
      </span>
    );
  }

  const filled = PRIORITY_FILLED[priority];

  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex h-[16px] w-[16px] shrink-0 items-end justify-center gap-[2px]",
        PRIORITY_COLOR[priority],
      )}
    >
      {[5, 8, 11].map((height, index) => (
        <span
          key={height}
          style={{ height }}
          className={cx(
            "w-[3px] rounded-[1px]",
            index < filled ? "bg-current" : "bg-fg-faint/40",
          )}
        />
      ))}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-[6px] text-small text-fg-muted">
      <PriorityIcon priority={priority} />
      <span className="capitalize">{priority}</span>
    </span>
  );
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "text-slate", // decoration/grey
  in_progress: "text-yellow", // decoration/yellow
  done: "text-brand", // primary/5E6AD2
  cancelled: "text-fg-faint", // grey/6B6F76
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

/**
 * A 14px ring that fills clockwise with progress: empty for todo, a half pie
 * while in progress, solid once done. Cancelled keeps the ring but greys out
 * and gets a strike through the middle.
 */
export function StatusIcon({ status }: { status: TaskStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative inline-flex size-[14px] shrink-0 rounded-full border-[1.5px] border-current",
        STATUS_COLOR[status],
      )}
    >
      {status === "in_progress" ? (
        <span
          className="absolute inset-[2px] rounded-full"
          style={{
            background: "conic-gradient(currentColor 0deg 180deg, transparent 180deg)",
          }}
        />
      ) : null}
      {status === "done" ? (
        <span className="absolute inset-[2px] rounded-full bg-current" />
      ) : null}
      {status === "cancelled" ? (
        <span className="absolute inset-x-[2px] top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
      ) : null}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className="inline-flex items-center gap-[6px] text-small text-fg-muted">
      <StatusIcon status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Label pill — a coloured dot beside the name, inside a hairline capsule.
 *
 * The API gives a label no colour of its own, so one is derived from its id:
 * the same label then keeps the same colour on every page instead of shifting
 * between renders.
 */
const LABEL_DOT_COLORS = [
  "bg-purple",
  "bg-blue",
  "bg-teal",
  "bg-green",
  "bg-yellow",
  "bg-orange",
  "bg-red",
  "bg-slate",
] as const;

function dotColor(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return LABEL_DOT_COLORS[hash % LABEL_DOT_COLORS.length];
}

export function LabelDot({ id, className }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("size-[6px] shrink-0 rounded-full", dotColor(id), className)}
    />
  );
}

export function LabelChip({ label }: { label: LabelResponse }) {
  return (
    <span
      title={label.description ?? undefined}
      className="inline-flex items-center gap-[6px] rounded-full border border-line-strong px-[8px] py-[2px] text-mini leading-[16px] text-fg-muted"
    >
      <LabelDot id={label.id} />
      {label.name}
    </span>
  );
}

/*
  `className` carries the display utility rather than adding to one. Baking
  `inline-flex` in and passing `hidden` alongside it leaves two unprefixed
  utilities fighting, and Tailwind settles that by stylesheet order, not by the
  order they appear in the attribute — so the chips stayed visible at every
  width. Nothing here sets `display`, so whatever is passed simply wins.
*/
export function LabelChips({
  labels,
  className = "inline-flex",
}: {
  labels: LabelResponse[];
  className?: string;
}) {
  if (labels.length === 0) return null;
  return (
    <span className={cx("flex-wrap items-center gap-[4px]", className)}>
      {labels.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
    </span>
  );
}

/**
 * The attach/detach control on a detail page, as a chip that matches the chips
 * it produces.
 *
 * These were primary buttons before, which made a row of solid brand fills the
 * loudest thing on a task page — the visual weight of a call to action spent on
 * a tag. Attached now reads as a wash of the brand behind the same capsule, and
 * an unattached label is quiet until it is hovered.
 */
export function LabelToggle({
  label,
  attached,
  className,
}: {
  label: LabelResponse;
  attached: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      // The pressed state is what a toggle is, so it is said out loud rather
      // than left to the fill colour.
      aria-pressed={attached}
      title={label.description ?? undefined}
      className={cx(
        "inline-flex cursor-pointer items-center gap-[6px] rounded-full border px-[10px] py-[3px]",
        "text-mini leading-[16px] transition-colors duration-100 active:translate-y-[0.5px]",
        attached
          ? "border-brand/50 bg-brand-wash text-fg"
          : "border-line-strong bg-transparent text-fg-subtle hover:border-line-input hover:bg-overlay-hover hover:text-fg",
        className,
      )}
    >
      <LabelDot id={label.id} className={attached ? undefined : "opacity-50"} />
      {label.name}
    </button>
  );
}

export { STATUS_LABEL };
export { EmptyState } from "./ui";
