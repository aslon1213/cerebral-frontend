import { createAgentsApi } from "./endpoints/agents";
import { createApiKeysApi } from "./endpoints/api-keys";
import { createAuthApi } from "./endpoints/auth";
import { createExecutionsApi } from "./endpoints/executions";
import { createInterventionsApi } from "./endpoints/interventions";
import { createLabelsApi } from "./endpoints/labels";
import { createProjectsApi } from "./endpoints/projects";
import { createReposApi } from "./endpoints/repos";
import { createTasksApi } from "./endpoints/tasks";
import { createRequester, type CreateRequesterOptions, type Requester } from "./http";

export interface ApiClient {
  auth: ReturnType<typeof createAuthApi>;
  projects: ReturnType<typeof createProjectsApi>;
  tasks: ReturnType<typeof createTasksApi>;
  labels: ReturnType<typeof createLabelsApi>;
  /** Runs. Read-only but for `remove` — every write is the observer bot's. */
  executions: ReturnType<typeof createExecutionsApi>;
  /** The inbox: what agents are blocked on. */
  interventions: ReturnType<typeof createInterventionsApi>;
  agents: ReturnType<typeof createAgentsApi>;
  /** Repos, and the change history that sits beside the reasoning. */
  repos: ReturnType<typeof createReposApi>;
  /** Credentials for observer bots. */
  apiKeys: ReturnType<typeof createApiKeysApi>;
  /** Escape hatch for endpoints not yet wrapped. */
  request: Requester;
}

/**
 * Assemble a client over any transport.
 *
 * Most app code should import the ready-made session-bound client from
 * `lib/api/server` instead; use this directly for unauthenticated calls,
 * scripts, or tests with an injected `fetchImpl`.
 */
export function createApiClient(options: CreateRequesterOptions = {}): ApiClient {
  return createApiClientFromRequester(createRequester(options));
}

/**
 * Assemble a client over an already-built transport — used to layer behaviour
 * (session tokens, refresh-and-retry) around the plain requester.
 */
export function createApiClientFromRequester(request: Requester): ApiClient {
  return {
    auth: createAuthApi(request),
    projects: createProjectsApi(request),
    tasks: createTasksApi(request),
    labels: createLabelsApi(request),
    executions: createExecutionsApi(request),
    interventions: createInterventionsApi(request),
    agents: createAgentsApi(request),
    repos: createReposApi(request),
    apiKeys: createApiKeysApi(request),
    request,
  };
}
