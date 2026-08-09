import {
  LabelChips,
  PRIORITY_LABEL,
  PriorityIcon,
  StatusIcon,
} from "@/app/_components/badges";
import { FilterForm, StatusSelect, SubmitButton } from "@/app/_components/form-ui";
import { IssuesIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/_components/icons";
import {
  List,
  ListGroupHeader,
  ListRow,
  RowActions,
  RowControls,
  RowMeta,
  RowTitle,
  Toolbar,
} from "@/app/_components/list";
import { TaskForm } from "@/app/_components/task-form";
import {
  Card,
  Container,
  Disclosure,
  EmptyState,
  Input,
  PageHeader,
  Select,
  TextLink,
} from "@/app/_components/ui";
import { RunSummary } from "@/app/_components/run-badges";
import { createTaskAction, deleteTaskAction, setTaskStatusAction } from "@/app/actions/tasks";
import { api } from "@/lib/api/server";
import {
  describeRunStats,
  loadExecutionStats,
  MAX_RUNS_SCANNED,
  type TaskRunStats,
} from "@/lib/execution-stats";
import { formatDueDate, isOverdue } from "@/lib/format";
import { EXECUTION_STATUS_LABEL } from "@/lib/vocabulary";
import {
  PRIORITIES,
  TASK_STATUSES,
  type Priority,
  type TaskResponse,
  type TaskSort,
  type TaskStatus,
} from "@/lib/api/types";

export const metadata = { title: "Tasks" };

const STATUS_HEADING: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    project_id?: string;
    sort_by?: string;
    new?: string;
    focus?: string;
  }>;
}) {
  const filters = await searchParams;
  const status = TASK_STATUSES.includes(filters.status as TaskStatus)
    ? (filters.status as TaskStatus)
    : undefined;
  const priority = PRIORITIES.includes(filters.priority as Priority)
    ? (filters.priority as Priority)
    : undefined;

  const [page, projects, labels, runs] = await Promise.all([
    api.tasks.list({
      q: filters.q || undefined,
      status,
      priority,
      project_id: filters.project_id || undefined,
      sort_by: (filters.sort_by as TaskSort) || "created_at",
      order: "desc",
      limit: 200,
    }),
    api.projects.list({ limit: 200, sort_by: "name", order: "asc" }),
    api.labels.list({ limit: 200 }),
    // Grouped from one read rather than a lookup per row — see the note in
    // `lib/execution-stats`. Scoped to the same project as the task filter so
    // the two reads agree.
    loadExecutionStats({ projectId: filters.project_id }),
  ]);

  const projectNames = new Map(projects.items.map((project) => [project.id, project.name]));
  const hasFilters = Boolean(
    filters.q || filters.status || filters.priority || filters.project_id,
  );

  // Linear groups its issue list by status, so the rows are bucketed the same
  // way here. Empty buckets are dropped rather than shown as empty headings.
  const grouped = TASK_STATUSES.map((value) => ({
    status: value,
    tasks: page.items.filter((task) => task.status === value),
  })).filter((group) => group.tasks.length > 0);

  return (
    <>
      <PageHeader
        title="Tasks"
        icon={<IssuesIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "task" : "tasks"}
          </span>
        }
      />

      <Toolbar>
        <FilterForm className="flex flex-1 flex-wrap items-center gap-[8px]">
          <span className="relative flex items-center">
            <SearchIcon
              size={13}
              className="pointer-events-none absolute left-[9px] text-fg-faint"
            />
            <Input
              name="q"
              density="compact"
              defaultValue={filters.q ?? ""}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              // The sidebar's magnifier lands here; putting the caret in the
              // field is the whole point of having pressed it.
              autoFocus={filters.focus === "search"}
              className="w-[200px] pl-[28px]"
            />
          </span>
          <Select
            name="status"
            density="compact"
            defaultValue={filters.status ?? ""}
            aria-label="Filter by status"
            className="w-[140px]"
          >
            <option value="">Any status</option>
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_HEADING[value]}
              </option>
            ))}
          </Select>
          <Select
            name="priority"
            density="compact"
            defaultValue={filters.priority ?? ""}
            aria-label="Filter by priority"
            className="w-[140px]"
          >
            <option value="">Any priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABEL[value]}
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
          {hasFilters ? (
            <TextLink
              href="/tasks"
              className="px-[4px] text-mini text-fg-subtle hover:text-fg"
            >
              Clear
            </TextLink>
          ) : null}
        </FilterForm>
      </Toolbar>

      <Container className="flex flex-col gap-[16px] py-[20px]">
        {projects.items.length === 0 ? (
          <EmptyState
            icon={<IssuesIcon size={15} />}
            title="Tasks live inside a project"
            action={
              <TextLink href="/projects?new=1" className="text-small text-brand-ring">
                Create a project first
              </TextLink>
            }
          >
            Once you have somewhere to put them, tasks can be added here.
          </EmptyState>
        ) : (
          <Disclosure
            summary="New task"
            icon={<PlusIcon size={12} />}
            open={filters.new === "1"}
          >
            <Card className="p-[16px]">
              <TaskForm
                action={createTaskAction}
                projects={projects.items}
                labels={labels.items}
                submitLabel="Add task"
              />
            </Card>
          </Disclosure>
        )}

        {page.items.length === 0 && projects.items.length > 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchIcon size={15} />}
              title="No tasks match those filters"
              action={
                <TextLink href="/tasks" className="text-small text-brand-ring">
                  Clear filters
                </TextLink>
              }
            >
              Try a broader search, or widen the status and priority.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<IssuesIcon size={15} />}
              title="No tasks yet"
              action={
                <TextLink href="/tasks?new=1" className="text-small text-brand-ring">
                  Add the first one
                </TextLink>
              }
            >
              Everything you are working on, grouped by how far along it is.
            </EmptyState>
          )
        ) : null}

        {/*
          Run counts are grouped from a bounded read, so past that bound they
          are floors rather than totals. Saying so beats quietly showing a
          number that is wrong.
        */}
        {runs.truncated ? (
          <p className="text-mini leading-[16px] text-fg-faint">
            Run counts cover the {MAX_RUNS_SCANNED.toLocaleString()} most recent runs;
            tasks last run before that may show fewer than they have.
          </p>
        ) : null}

        {grouped.map((group) => (
          <List key={group.status}>
            <ListGroupHeader
              icon={<StatusIcon status={group.status} />}
              title={STATUS_HEADING[group.status]}
              count={group.tasks.length}
            />
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectName={projectNames.get(task.project_id)}
                runs={runs.byTask.get(task.id)}
              />
            ))}
          </List>
        ))}
      </Container>
    </>
  );
}

function TaskRow({
  task,
  projectName,
  runs,
}: {
  task: TaskResponse;
  projectName?: string;
  /** Absent when no agent has run this task. */
  runs?: TaskRunStats;
}) {
  const overdue =
    Boolean(task.due_date) && isOverdue(task.due_date) && task.status !== "done";

  return (
    <ListRow>
      <PriorityIcon priority={task.priority} />

      {/*
        Status leads the row beside priority rather than trailing it at the far
        right edge, where a lone unlabelled ring read as decoration. The two
        glyphs together are how the library composes an issue row, and it puts
        the control that changes the row next to the row's own name.
      */}
      <form action={setTaskStatusAction} className="relative z-[1] flex shrink-0">
        <input type="hidden" name="task_id" value={task.id} />
        <StatusSelect
          name="status"
          value={task.status}
          options={TASK_STATUSES}
          label={`Status for ${task.name}`}
          // The group heading above already names the status.
          showLabel={false}
        />
      </form>

      <RowTitle
        href={`/tasks/${task.id}`}
        // A cancelled task is struck through rather than merely greyed, so it
        // stays legible while reading as work that is no longer happening.
        className={task.status === "cancelled" ? "text-fg-subtle line-through" : undefined}
      >
        {task.name}
      </RowTitle>

      <RowControls>
        {/* Labels are supplementary; on a narrow screen the task's own name is
            worth more than the tags on it. */}
        <LabelChips labels={task.labels} className="hidden md:inline-flex" />

        {/*
          Only when there is something to say. A "0" against every task that no
          agent has touched would put a column of nothing down the list and bury
          the handful of rows where the number matters.
        */}
        {runs ? (
          <RunSummary
            count={runs.total}
            latestStatus={runs.latest.status}
            blocked={runs.blocked}
            href={`/tasks/${task.id}#runs`}
            title={describeRunStats(runs, EXECUTION_STATUS_LABEL)}
          />
        ) : null}

        {/* Fixed widths from here on, so the last two things on every row line
            up as columns instead of drifting with the labels beside them. */}
        <TextLink
          href={`/projects/${task.project_id}`}
          className="hidden w-[150px] truncate text-right text-mini text-fg-subtle hover:text-fg lg:block"
        >
          {projectName ?? "project"}
        </TextLink>

        <RowMeta tone={overdue ? "critical" : "subtle"} className="w-[76px] text-right">
          {formatDueDate(task.due_date)}
        </RowMeta>

        <RowActions>
          <form action={deleteTaskAction}>
            <input type="hidden" name="task_id" value={task.id} />
            <SubmitButton variant="tertiary" size="small" destructive>
              <TrashIcon size={13} />
              <span className="sr-only">Delete {task.name}</span>
            </SubmitButton>
          </form>
        </RowActions>
      </RowControls>
    </ListRow>
  );
}
