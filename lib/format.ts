import type { DateTimeString } from "./api/types";

/** Format an API timestamp for display, tolerating nulls. */
export function formatDate(value: DateTimeString | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Convert an API timestamp into the `YYYY-MM-DD` that `s-date-field` expects.
 *
 * Uses the UTC date so a value round-trips to the same day it was saved as;
 * reading local parts would shift the date for users behind UTC.
 */
export function toDateInput(value: DateTimeString | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** True when a due date is in the past. */
export function isOverdue(due: DateTimeString | null | undefined): boolean {
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from today to `date`, counted in local calendar days. */
function daysAway(date: Date): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * A due date said the way someone would say it out loud.
 *
 * "Aug 22" is a lookup: you have to know today's date to know whether it
 * matters. Inside the fortnight either side of now — the window where a due
 * date is actually actionable — the distance is what carries the meaning, so
 * that is what gets printed. Beyond it the calendar date is the more useful
 * fact and comes back.
 */
export function formatDueDate(value: DateTimeString | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const days = daysAway(date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days <= 14) return `in ${days} days`;
  if (days < -1 && days >= -14) return `${Math.abs(days)} days ago`;

  // Same-year dates drop the year; it is noise when it is this year.
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * How long ago, said the way a person would say it.
 *
 * The inbox is sorted by how long an agent has been stuck, so this is the
 * number the screen is really about — "3 hours" beside a blocked run is the
 * cost of not having answered it yet.
 */
export function formatRelative(value: DateTimeString | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const future = seconds < 0;
  const magnitude = Math.abs(seconds);

  const say = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  let phrase: string;
  if (magnitude < 45) phrase = "moments";
  else if (magnitude < 3600) phrase = say(Math.round(magnitude / 60), "minute");
  else if (magnitude < 86_400) phrase = say(Math.round(magnitude / 3600), "hour");
  else if (magnitude < 2_592_000) phrase = say(Math.round(magnitude / 86_400), "day");
  else if (magnitude < 31_536_000) phrase = say(Math.round(magnitude / 2_592_000), "month");
  else phrase = say(Math.round(magnitude / 31_536_000), "year");

  if (phrase === "moments") return future ? "in moments" : "just now";
  return future ? `in ${phrase}` : `${phrase} ago`;
}

/** Bare elapsed time with no "ago" — for a label that already supplies one. */
export function formatElapsed(value: DateTimeString | null | undefined): string {
  const relative = formatRelative(value);
  if (relative === "—") return "—";
  if (relative === "just now") return "moments";
  return relative.replace(/^in /, "").replace(/ ago$/, "");
}

/** How long a run took, from two timestamps. */
export function formatDuration(
  from: DateTimeString | null | undefined,
  to: DateTimeString | null | undefined,
): string {
  if (!from || !to) return "—";
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";

  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** The full timestamp, for a `title` where the relative form is ambiguous. */
export function formatExact(value: DateTimeString | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Token counts, which run to six figures and are unreadable in full. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const thousands = value / 1000;
    return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}k`;
  }
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/**
 * Cost, which the API sends as a decimal *string* so it is never rounded in
 * transit. Parsed only to choose how many places to show.
 */
export function formatCost(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  if (amount === 0) return "$0.00";
  return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}
