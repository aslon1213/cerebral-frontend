import type { TaskResponse, TaskStatus } from "@/lib/api/types";

import { cx } from "./ui";

/**
 * How far along is this?
 *
 * The one question a project list is opened to answer, and the one thing this
 * app never showed. Every project row carried a name, a date and a wide empty
 * gutter; the meter puts the answer in that gutter.
 *
 * It draws on `decoration/*` already in use for status elsewhere — done takes
 * the brand, in-progress the yellow it has in `StatusIcon` — so it reads as the
 * same vocabulary at a glance rather than as a new one.
 */

export interface TaskCounts {
  todo: number;
  in_progress: number;
  done: number;
  cancelled: number;
  /** Everything except cancelled: work that is still on the books. */
  total: number;
}

export function countTasks(tasks: TaskResponse[]): TaskCounts {
  const counts = { todo: 0, in_progress: 0, done: 0, cancelled: 0 };
  for (const task of tasks) counts[task.status] += 1;

  return {
    ...counts,
    // A cancelled task is not outstanding work, so counting it in the
    // denominator would hold the meter below 100% on a project that is finished.
    total: counts.todo + counts.in_progress + counts.done,
  };
}

/**
 * The meter itself: one track, filled left to right by how settled the work is.
 * Done leads, in-progress follows, and whatever remains is the empty track — so
 * the filled length reads as "how much of this is no longer waiting".
 */
export function ProgressBar({
  counts,
  size = "small",
  className,
}: {
  counts: TaskCounts;
  size?: "small" | "large";
  className?: string;
}) {
  const { done, in_progress, total } = counts;
  const percent = (value: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} tasks done`}
      className={cx(
        "flex overflow-hidden rounded-full bg-line-strong",
        size === "large" ? "h-[6px]" : "h-[4px]",
        className,
      )}
    >
      <span
        className="bg-brand transition-[width] duration-300"
        style={{ width: `${percent(done)}%` }}
      />
      <span
        className="bg-yellow transition-[width] duration-300"
        style={{ width: `${percent(in_progress)}%` }}
      />
    </span>
  );
}

/**
 * Row form: a short track with the fraction beside it.
 *
 * `tabular-nums` matters more than it looks — without it the counts jitter
 * left and right down the column as the digits change width.
 */
export function ProgressMeter({ counts }: { counts: TaskCounts }) {
  if (counts.total === 0) {
    return (
      <span className="hidden w-[104px] shrink-0 text-right text-mini leading-[16px] text-fg-faint md:inline">
        No tasks
      </span>
    );
  }

  return (
    <span className="hidden w-[104px] shrink-0 items-center gap-[8px] md:flex">
      <ProgressBar counts={counts} className="w-[60px] shrink-0" />
      <span className="shrink-0 text-mini leading-[16px] text-fg-subtle tabular-nums">
        {counts.done}/{counts.total}
      </span>
    </span>
  );
}

const LEGEND: Array<{ key: keyof TaskCounts; label: string; dot: string }> = [
  { key: "done", label: "Done", dot: "bg-brand" },
  { key: "in_progress", label: "In progress", dot: "bg-yellow" },
  { key: "todo", label: "Todo", dot: "bg-line-strong" },
  { key: "cancelled", label: "Cancelled", dot: "bg-fg-faint" },
];

/**
 * Header form: the same meter at full width, with the breakdown spelled out
 * underneath so the bar's proportions can be read as numbers too.
 */
export function ProgressSummary({ counts }: { counts: TaskCounts }) {
  if (counts.total === 0) {
    return <p className="text-small text-fg-faint">No tasks yet</p>;
  }

  const percent = Math.round((counts.done / counts.total) * 100);

  /*
    Three things, each saying something the others do not: the figure, the
    shape, the breakdown. An earlier draft also carried a "2 of 5 tasks done"
    line above the bar, which was the figure and the breakdown's first entry
    restated in a sentence — so it went.
  */
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-title3 font-medium text-fg tabular-nums">{percent}%</p>

      <ProgressBar counts={counts} size="large" />

      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[4px]">
        {LEGEND.filter((entry) => counts[entry.key] > 0).map((entry) => (
          <span
            key={entry.key}
            className="inline-flex items-center gap-[6px] text-mini leading-[16px] text-fg-subtle"
          >
            <span className={cx("size-[6px] shrink-0 rounded-full", entry.dot)} />
            {entry.label}
            <span className="text-fg-faint tabular-nums">{counts[entry.key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export type { TaskStatus };
