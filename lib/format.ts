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
