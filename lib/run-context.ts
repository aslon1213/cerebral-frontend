import { ApiError } from "./api/errors";
import { api } from "./api/server";
import type { ExecutionResponse, UUID } from "./api/types";

/**
 * Naming a run in words a person recognises.
 *
 * An execution carries a `task_id` and nothing else legible — no task name, no
 * project. Both are one lookup away, but a list of runs would fan out into
 * three requests a row if each row asked for its own. So callers hand over
 * every run on the page at once and get one map back, with each distinct task
 * and project fetched exactly once however many runs share it.
 */

export interface RunContext {
  taskName?: string;
  projectName?: string;
  agentName?: string;
}

/** Missing is normal here: a 404 also means "not yours", and neither is fatal. */
async function tolerate<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) return null;
    throw error;
  }
}

async function resolveMany<T>(ids: UUID[], get: (id: UUID) => Promise<T>) {
  const unique = [...new Set(ids)];
  const results = await Promise.all(unique.map((id) => tolerate(get(id))));
  return new Map(unique.map((id, index) => [id, results[index]]));
}

/**
 * Build a `RunContext` for each execution, keyed by execution id.
 *
 * Tasks are fetched first because the project a run belongs to is only
 * reachable through its task.
 */
export async function loadRunContexts(
  executions: Pick<ExecutionResponse, "id" | "task_id" | "executor_agent_id">[],
): Promise<Map<UUID, RunContext>> {
  if (executions.length === 0) return new Map();

  const [tasks, agents] = await Promise.all([
    resolveMany(
      executions.map((execution) => execution.task_id),
      (id) => api.tasks.get(id),
    ),
    resolveMany(
      executions
        .map((execution) => execution.executor_agent_id)
        .filter((id): id is UUID => id !== null),
      (id) => api.agents.get(id),
    ),
  ]);

  const projects = await resolveMany(
    [...tasks.values()].flatMap((task) => (task ? [task.project_id] : [])),
    (id) => api.projects.get(id),
  );

  return new Map(
    executions.map((execution) => {
      const task = tasks.get(execution.task_id);
      const project = task ? projects.get(task.project_id) : null;
      const agent = execution.executor_agent_id
        ? agents.get(execution.executor_agent_id)
        : null;

      return [
        execution.id,
        {
          taskName: task?.name,
          projectName: project?.name,
          agentName: agent?.name,
        },
      ];
    }),
  );
}

/** The same, for one run. */
export async function loadRunContext(
  execution: Pick<ExecutionResponse, "id" | "task_id" | "executor_agent_id">,
): Promise<RunContext> {
  const map = await loadRunContexts([execution]);
  return map.get(execution.id) ?? {};
}
