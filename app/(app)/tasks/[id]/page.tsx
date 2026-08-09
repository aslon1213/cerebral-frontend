import { notFound } from "next/navigation";
import { cache } from "react";

import { LabelToggle, PriorityBadge, StatusBadge } from "@/app/_components/badges";
import { SubmitButton } from "@/app/_components/form-ui";
import { AgentIcon, IssuesIcon, RunsIcon, TrashIcon } from "@/app/_components/icons";
import { List, ListRow, RowControls, RowMeta, RowTitle } from "@/app/_components/list";
import {
  AttemptBadge,
  ExecutionStatusBadge,
  ExecutionStatusIcon,
} from "@/app/_components/run-badges";
import { TaskForm } from "@/app/_components/task-form";
import {
  Card,
  Container,
  Disclosure,
  EmptyState,
  PageHeader,
  Property,
  Rail,
  RailSection,
  Section,
  TextLink,
} from "@/app/_components/ui";
import { deleteTaskAction, setTaskLabelAction, updateTaskAction } from "@/app/actions/tasks";
import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import { formatCost, formatDate, formatDueDate, formatDuration, formatRelative, isOverdue } from "@/lib/format";
import { loadRunContexts } from "@/lib/run-context";
import { executionPhase } from "@/lib/api/types";

/** Enough to show the history without turning the page into a run list. */
const RUNS_SHOWN = 20;

/* Shared by `generateMetadata` and the render — see the note on the project page. */
const getTask = cache(async (id: string) => {
  try {
    return await api.tasks.get(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  return { title: task.name };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTask(id);

  const [project, labels, runs] = await Promise.all([
    api.projects.get(task.project_id),
    api.labels.list({ limit: 200 }),
    // One task, so this filters server-side rather than being grouped from a
    // wider read the way the task list has to.
    api.executions.list({
      task_id: id,
      sort_by: "created_at",
      order: "desc",
      limit: RUNS_SHOWN,
    }),
  ]);

  const runContexts = await loadRunContexts(runs.items);
  const blocked = runs.items.filter((run) => executionPhase(run.status) === "blocked");

  const attachedIds = new Set(task.labels.map((label) => label.id));
  const overdue =
    Boolean(task.due_date) && isOverdue(task.due_date) && task.status !== "done";

  return (
    <>
      <PageHeader
        title={task.name}
        icon={<IssuesIcon />}
        breadcrumb={
          <TextLink href="/tasks" className="text-small text-fg-subtle hover:text-fg">
            Tasks
          </TextLink>
        }
        actions={
          <form action={deleteTaskAction}>
            <input type="hidden" name="task_id" value={task.id} />
            <SubmitButton variant="tertiary" size="small" destructive>
              <TrashIcon size={13} />
              Delete
            </SubmitButton>
          </form>
        }
      />

      <Container className="py-[24px]">
        <div className="flex flex-col gap-[32px] lg:flex-row lg:items-start lg:gap-[40px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[24px]">
            <h1
              className={
                task.status === "cancelled"
                  ? "text-title2 font-medium text-fg-subtle line-through"
                  : "text-title2 font-medium text-fg"
              }
            >
              {task.name}
            </h1>

            {task.description ? (
              <p className="max-w-[68ch] text-normal text-fg-muted">{task.description}</p>
            ) : (
              <p className="text-normal text-fg-faint">No description yet.</p>
            )}

            {/*
              What the agents actually did about this task, on the task itself.
              A task whose runs are only reachable from a separate Runs screen
              makes you hold an id in your head to cross-reference them.
            */}
            <Section
              heading={
                <span id="runs" className="scroll-mt-[68px]">
                  Runs {runs.total > 0 ? `(${runs.total})` : null}
                </span>
              }
              action={
                runs.total > RUNS_SHOWN ? (
                  <TextLink
                    href={`/runs?task_id=${task.id}`}
                    className="text-mini text-fg-subtle hover:text-fg"
                  >
                    See all {runs.total} →
                  </TextLink>
                ) : null
              }
              className="border-t border-line pt-[20px]"
            >
              {blocked.length > 0 ? (
                <div className="flex flex-wrap items-center gap-[10px] rounded-input border border-orange/40 bg-orange/8 px-[13px] py-[9px]">
                  <p className="min-w-0 flex-1 text-small text-fg-muted">
                    {blocked.length === 1
                      ? "An agent has stopped and is waiting on you."
                      : `${blocked.length} agents have stopped and are waiting on you.`}
                  </p>
                  <TextLink href="/inbox" className="shrink-0 text-mini text-orange">
                    Answer in the inbox →
                  </TextLink>
                </div>
              ) : null}

              {runs.items.length === 0 ? (
                <EmptyState icon={<RunsIcon size={15} />} title="No agent has run this task">
                  Runs are opened by an agent rather than from here. When one picks
                  this task up, every attempt appears in this list with its
                  transcript.
                </EmptyState>
              ) : (
                <List>
                  {runs.items.map((run) => {
                    const context = runContexts.get(run.id);
                    const finished = run.finished_at !== null;

                    return (
                      <ListRow key={run.id}>
                        <ExecutionStatusIcon status={run.status} />

                        <RowTitle href={`/runs/${run.id}`}>
                          <span className="text-small">
                            {context?.agentName ?? "Unknown agent"}
                            {run.model ? (
                              <span className="text-fg-faint"> · {run.model}</span>
                            ) : null}
                          </span>
                        </RowTitle>

                        {/*
                          Narrower columns than the runs list uses: this one
                          shares its width with the properties rail, and the
                          agent's name is what identifies a row here — the task
                          is already named by the page.
                        */}
                        <RowControls>
                          <AttemptBadge attempt={run.attempt} />

                          <RowMeta className="hidden w-[56px] text-right lg:block">
                            {formatCost(run.cost_usd)}
                          </RowMeta>

                          {/* `whitespace-nowrap` because "17 minutes ago"
                              otherwise wraps and makes one row taller than the
                              rest of the list. */}
                          <RowMeta className="w-[88px] truncate text-right whitespace-nowrap">
                            {finished
                              ? formatDuration(run.started_at, run.finished_at)
                              : formatRelative(run.created_at)}
                          </RowMeta>

                          <span className="hidden w-[118px] justify-end sm:flex">
                            <ExecutionStatusBadge status={run.status} short />
                          </span>
                        </RowControls>
                      </ListRow>
                    );
                  })}
                </List>
              )}
            </Section>

            {/* Folded, so the page shows the task once rather than printing
                every field again in an open form below the one that reads it. */}
            <Disclosure summary="Edit task" className="border-t border-line pt-[20px]">
              <Card className="p-[16px]">
                <TaskForm
                  action={updateTaskAction}
                  task={task}
                  submitLabel="Save changes"
                />
              </Card>
            </Disclosure>
          </div>

          <Rail>
            <RailSection heading="Properties">
              <Property label="Status">
                <StatusBadge status={task.status} />
              </Property>
              <Property label="Priority">
                <PriorityBadge priority={task.priority} />
              </Property>
              <Property label="Due">
                <span className={overdue ? "text-red" : undefined}>
                  {formatDueDate(task.due_date)}
                </span>
              </Property>
              <Property label="Project">
                <TextLink
                  href={`/projects/${project.id}`}
                  className="text-small text-fg-muted hover:text-brand-ring"
                >
                  {project.name}
                </TextLink>
              </Property>
            </RailSection>

            {labels.items.length > 0 ? (
              <RailSection heading="Labels">
                <div className="flex flex-wrap items-center gap-[6px] pt-[2px]">
                  {labels.items.map((label) => {
                    const attached = attachedIds.has(label.id);
                    return (
                      <form key={label.id} action={setTaskLabelAction}>
                        <input type="hidden" name="task_id" value={task.id} />
                        <input type="hidden" name="label_id" value={label.id} />
                        <input
                          type="hidden"
                          name="attached"
                          value={attached ? "1" : "0"}
                        />
                        <LabelToggle label={label} attached={attached} />
                      </form>
                    );
                  })}
                </div>
              </RailSection>
            ) : null}

            {runs.total > 0 ? (
              <RailSection heading="Runs">
                <Property label="Attempts">{runs.total}</Property>
                <Property label="Latest">
                  <ExecutionStatusBadge status={runs.items[0].status} />
                </Property>
                {runs.items[0].executor_agent_id ? (
                  <Property label="Last agent">
                    <span className="inline-flex items-center gap-[6px]">
                      <AgentIcon size={13} />
                      {runContexts.get(runs.items[0].id)?.agentName ?? "—"}
                    </span>
                  </Property>
                ) : null}
                {/*
                  Summed from the runs on this page, so the label says "last 20"
                  once there are more than that. A total that silently stops
                  counting is worse than one that admits its window.
                */}
                <Property
                  label={runs.total > RUNS_SHOWN ? `Spent (last ${RUNS_SHOWN})` : "Spent"}
                >
                  {formatCost(
                    // Decimal strings, summed as numbers only to be displayed —
                    // nothing downstream depends on the rounding.
                    runs.items
                      .reduce((total, run) => total + Number(run.cost_usd ?? 0), 0)
                      .toString(),
                  )}
                </Property>
              </RailSection>
            ) : null}

            <RailSection heading="Activity">
              <Property label="Created">{formatDate(task.created_at)}</Property>
              <Property label="Updated">{formatDate(task.updated_at)}</Property>
            </RailSection>
          </Rail>
        </div>
      </Container>
    </>
  );
}
