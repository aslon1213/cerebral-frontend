import { createAuthApi } from "./endpoints/auth";
import { createLabelsApi } from "./endpoints/labels";
import { createProjectsApi } from "./endpoints/projects";
import { createTasksApi } from "./endpoints/tasks";
import { createRequester, type CreateRequesterOptions, type Requester } from "./http";

export interface ApiClient {
  auth: ReturnType<typeof createAuthApi>;
  projects: ReturnType<typeof createProjectsApi>;
  tasks: ReturnType<typeof createTasksApi>;
  labels: ReturnType<typeof createLabelsApi>;
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
    request,
  };
}
