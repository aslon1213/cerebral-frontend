import { FilterForm } from "@/app/_components/form-ui";
import { AgentIcon, RunsIcon, SearchIcon } from "@/app/_components/icons";
import {
  List,
  ListGroupHeader,
  ListRow,
  Pagination,
  RowControls,
  RowMeta,
  RowTitle,
  Toolbar,
} from "@/app/_components/list";
import {
  AttemptBadge,
  ExecutionStatusBadge,
  ExecutionStatusIcon,
} from "@/app/_components/run-badges";
import {
  Container,
  EmptyState,
  PageHeader,
  Select,
  TextLink,
} from "@/app/_components/ui";
import { api } from "@/lib/api/server";
import { formatCost, formatDuration, formatRelative } from "@/lib/format";
import { loadRunContexts, type RunContext } from "@/lib/run-context";
import { EXECUTION_STATUS_LABEL } from "@/lib/vocabulary";
import {
  EXECUTION_STATUSES,
  EXECUTION_SORTS,
  executionPhase,
  type ExecutionPhase,
  type ExecutionResponse,
  type ExecutionSort,
  type ExecutionStatus,
  type SortOrder,
} from "@/lib/api/types";

export const metadata = { title: "Runs" };

const PAGE_SIZE = 50;

/**
 * Seven statuses, three headings.
 *
 * Blocked leads regardless of when those runs started, because it is the only
 * group a person can do anything about — the rest is history or in flight.
 */
const PHASE_HEADING: Record<ExecutionPhase, string> = {
  blocked: "Blocked — waiting on you",
  live: "In flight",
  over: "Finished",
};

const PHASE_ORDER: ExecutionPhase[] = ["blocked", "live", "over"];

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;

  const status = EXECUTION_STATUSES.includes(filters.status as ExecutionStatus)
    ? (filters.status as ExecutionStatus)
    : undefined;
  const sortBy = EXECUTION_SORTS.includes(filters.sort_by as ExecutionSort)
    ? (filters.sort_by as ExecutionSort)
    : "created_at";
  const order: SortOrder = filters.order === "asc" ? "asc" : "desc";
  const offset = Math.max(0, Number(filters.offset ?? 0) || 0);

  const [page, projects, agents, repos] = await Promise.all([
    api.executions.list({
      status,
      project_id: filters.project_id || undefined,
      agent_id: filters.agent_id || undefined,
      repo_id: filters.repo_id || undefined,
      task_id: filters.task_id || undefined,
      sort_by: sortBy,
      order,
      limit: PAGE_SIZE,
      offset,
    }),
    api.projects.list({ limit: 200, sort_by: "name", order: "asc" }),
    api.agents.list({ limit: 200, sort_by: "name", order: "asc" }),
    api.repos.list({ limit: 200, sort_by: "name", order: "asc" }),
  ]);

  const contexts = await loadRunContexts(page.items);

  const hasFilters = Boolean(
    filters.status ||
      filters.project_id ||
      filters.agent_id ||
      filters.repo_id ||
      filters.task_id,
  );

  /*
    Grouped only when the list is in its default order and unfiltered by status.
    Sorting by cost or duration and then bucketing by phase would scatter the
    order the person asked for across three boxes; filtering to one status makes
    every heading say the same thing.
  */
  const grouped =
    status === undefined && sortBy === "created_at"
      ? PHASE_ORDER.map((phase) => ({
          phase,
          runs: page.items.filter((run) => executionPhase(run.status) === phase),
        })).filter((group) => group.runs.length > 0)
      : null;

  const paginationParams = {
    status: filters.status,
    project_id: filters.project_id,
    agent_id: filters.agent_id,
    repo_id: filters.repo_id,
    task_id: filters.task_id,
    sort_by: filters.sort_by,
    order: filters.order,
  };

  return (
    <>
      <PageHeader
        title="Runs"
        icon={<RunsIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "run" : "runs"}
          </span>
        }
      />

      <Toolbar>
        <FilterForm className="flex flex-1 flex-wrap items-center gap-[8px]">
          {/* Paging is per-filter, so changing one has to start again at the
              first page rather than land on an offset that no longer exists. */}
          <Select
            name="status"
            density="compact"
            defaultValue={filters.status ?? ""}
            aria-label="Filter by status"
            className="w-[170px]"
          >
            <option value="">Any status</option>
            {EXECUTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {EXECUTION_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>
          <Select
            name="project_id"
            density="compact"
            defaultValue={filters.project_id ?? ""}
            aria-label="Filter by project"
            className="w-[170px]"
          >
            <option value="">Any project</option>
            {projects.items.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select
            name="agent_id"
            density="compact"
            defaultValue={filters.agent_id ?? ""}
            aria-label="Filter by agent"
            className="w-[160px]"
          >
            <option value="">Any agent</option>
            {agents.items.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
          <Select
            name="repo_id"
            density="compact"
            defaultValue={filters.repo_id ?? ""}
            aria-label="Filter by repo"
            className="w-[160px]"
          >
            <option value="">Any repo</option>
            {repos.items.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </Select>
          <Select
            name="sort_by"
            density="compact"
            defaultValue={sortBy}
            aria-label="Sort by"
            className="w-[150px]"
          >
            <option value="created_at">Newest</option>
            <option value="updated_at">Recently updated</option>
            <option value="started_at">Started</option>
            <option value="finished_at">Finished</option>
            <option value="attempt">Attempt</option>
            <option value="status">Status</option>
          </Select>
          {filters.task_id ? (
            <input type="hidden" name="task_id" value={filters.task_id} />
          ) : null}
          {hasFilters ? (
            <TextLink href="/runs" className="px-[4px] text-mini text-fg-subtle hover:text-fg">
              Clear
            </TextLink>
          ) : null}
        </FilterForm>
      </Toolbar>

      <Container className="flex flex-col gap-[16px] py-[20px]">
        {page.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchIcon size={15} />}
              title="No runs match those filters"
              action={
                <TextLink href="/runs" className="text-small text-brand-ring">
                  Clear filters
                </TextLink>
              }
            >
              Try widening the status, or clearing the project and agent.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<RunsIcon size={15} />}
              title="No runs recorded yet"
              action={
                <TextLink href="/api-keys" className="text-small text-brand-ring">
                  Issue an API key
                </TextLink>
              }
            >
              Runs are opened by an agent, not from here. An observer bot needs an
              API key before it can record anything.
            </EmptyState>
          )
        ) : null}

        {grouped
          ? grouped.map((group) => (
              <List key={group.phase}>
                <ListGroupHeader
                  title={PHASE_HEADING[group.phase]}
                  count={group.runs.length}
                />
                {group.runs.map((run) => (
                  <RunRow key={run.id} run={run} context={contexts.get(run.id)} />
                ))}
              </List>
            ))
          : page.items.length > 0 && (
              <List>
                {page.items.map((run) => (
                  <RunRow key={run.id} run={run} context={contexts.get(run.id)} />
                ))}
              </List>
            )}

        <Pagination
          total={page.total}
          limit={PAGE_SIZE}
          offset={offset}
          params={paginationParams}
          basePath="/runs"
        />
      </Container>
    </>
  );
}

function RunRow({ run, context }: { run: ExecutionResponse; context?: RunContext }) {
  const phase = executionPhase(run.status);
  const finished = run.finished_at !== null;

  return (
    <ListRow>
      <ExecutionStatusIcon status={run.status} />

      <RowTitle href={`/runs/${run.id}`}>
        {context?.taskName ?? "Untitled task"}
      </RowTitle>

      <RowControls>
        <AttemptBadge attempt={run.attempt} />

        {/*
          A blocked run has somewhere to go that the run page is not: the inbox
          answers it in one click. Saying so on the row is the difference
          between noticing and acting.
        */}
        {phase === "blocked" ? (
          <TextLink
            href="/inbox"
            className="hidden shrink-0 text-mini leading-[16px] text-orange hover:text-orange sm:block"
          >
            Answer →
          </TextLink>
        ) : null}

        {context?.agentName ? (
          <span
            title={run.model ?? undefined}
            className="hidden w-[140px] items-center justify-end gap-[6px] truncate text-mini leading-[16px] text-fg-subtle lg:flex"
          >
            <AgentIcon size={13} />
            {context.agentName}
          </span>
        ) : null}

        <RowMeta className="hidden w-[64px] text-right md:block">
          {formatCost(run.cost_usd)}
        </RowMeta>

        <RowMeta className="w-[92px] text-right">
          {finished
            ? formatDuration(run.started_at, run.finished_at)
            : formatRelative(run.created_at)}
        </RowMeta>

        <span className="hidden w-[150px] justify-end lg:flex">
          <ExecutionStatusBadge status={run.status} short />
        </span>
      </RowControls>
    </ListRow>
  );
}
