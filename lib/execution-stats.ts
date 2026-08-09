import { api } from "./api/server";
import {
  executionPhase,
  type ExecutionResponse,
  type ExecutionStatus,
  type UUID,
} from "./api/types";

/**
 * How many times a task has been run, and how those runs went.
 *
 * There is no aggregate endpoint — no `GET /tasks/{id}/execution-count` — so a
 * count has to be derived from the runs themselves. Asking per task would be a
 * request per row, and the task list renders up to 200 of them, so instead the
 * runs are read once for the whole page and grouped here.
 */

export interface TaskRunStats {
  total: number;
  /** Newest first, so this is the run that says where the task stands now. */
  latest: ExecutionResponse;
  /** Runs stopped waiting on a human — the only count with any urgency. */
  blocked: number;
  running: number;
  failed: number;
  succeeded: number;
}

export interface ExecutionStats {
  byTask: Map<UUID, TaskRunStats>;
  /**
   * True when there were more runs than `MAX_RUNS_SCANNED`.
   *
   * Runs are read newest-first, so `latest` stays correct either way; what
   * degrades is `total`, which becomes a floor, and a task whose runs are all
   * older than the window drops out entirely. A screen that shows these counts
   * has to say so rather than present a floor as a fact.
   */
  truncated: boolean;
}

/** The API caps a page at 200. */
const PAGE_SIZE = 200;

/** Five pages. Far past any realistic project, and a hard stop on a runaway. */
export const MAX_RUNS_SCANNED = 1000;

export const EMPTY_STATS: ExecutionStats = { byTask: new Map(), truncated: false };

/**
 * Read the runs in scope and group them by task.
 *
 * `projectId` narrows the read to match a filtered task list; without it every
 * run the user owns is in scope. Either way this is one request in the common
 * case, and never more than five.
 */
export async function loadExecutionStats(
  options: { projectId?: UUID | null } = {},
): Promise<ExecutionStats> {
  const runs: ExecutionResponse[] = [];
  let truncated = false;

  for (let offset = 0; offset < MAX_RUNS_SCANNED; offset += PAGE_SIZE) {
    const page = await api.executions.list({
      project_id: options.projectId || undefined,
      sort_by: "created_at",
      order: "desc",
      limit: PAGE_SIZE,
      offset,
    });

    runs.push(...page.items);

    if (runs.length >= page.total) break;
    if (page.items.length === 0) break;
    if (runs.length >= MAX_RUNS_SCANNED) {
      truncated = page.total > runs.length;
      break;
    }
  }

  const byTask = new Map<UUID, TaskRunStats>();

  for (const run of runs) {
    const existing = byTask.get(run.task_id);
    const phase = executionPhase(run.status);

    if (existing === undefined) {
      // The first run seen for a task is its newest, since the read is
      // ordered by `created_at` descending.
      byTask.set(run.task_id, {
        total: 1,
        latest: run,
        blocked: phase === "blocked" ? 1 : 0,
        running: phase === "live" ? 1 : 0,
        failed: run.status === "failed" ? 1 : 0,
        succeeded: run.status === "succeeded" ? 1 : 0,
      });
      continue;
    }

    existing.total += 1;
    if (phase === "blocked") existing.blocked += 1;
    if (phase === "live") existing.running += 1;
    if (run.status === "failed") existing.failed += 1;
    if (run.status === "succeeded") existing.succeeded += 1;
  }

  return { byTask, truncated };
}

/** A sentence for a tooltip: "3 runs · latest failed · 1 waiting on you". */
export function describeRunStats(
  stats: TaskRunStats,
  statusLabel: Record<ExecutionStatus, string>,
): string {
  const parts = [`${stats.total} ${stats.total === 1 ? "run" : "runs"}`];
  parts.push(`latest ${statusLabel[stats.latest.status].toLowerCase()}`);
  if (stats.blocked > 0) parts.push(`${stats.blocked} waiting on you`);
  return parts.join(" · ");
}
