import { notFound } from "next/navigation";
import { cache } from "react";

import { LabelToggle, PriorityBadge, PriorityIcon } from "@/app/_components/badges";
import { StatusSelect, SubmitButton } from "@/app/_components/form-ui";
import { LayersIcon, PlusIcon, TrashIcon } from "@/app/_components/icons";
import {
  List,
  ListRow,
  RowActions,
  RowControls,
  RowMeta,
  RowTitle,
} from "@/app/_components/list";
import { countTasks, ProgressSummary } from "@/app/_components/progress";
import { ProjectForm } from "@/app/_components/project-form";
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
import {
  deleteProjectAction,
  setProjectLabelAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { createTaskAction, deleteTaskAction, setTaskStatusAction } from "@/app/actions/tasks";
import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import { formatDate, formatDueDate, isOverdue } from "@/lib/format";
import { TASK_STATUSES } from "@/lib/api/types";

/*
  `cache` dedupes the fetch across `generateMetadata` and the render, which run
  as two passes over the same request — without it the tab title would cost a
  second round trip to the API for the same project.
*/
const getProject = cache(async (id: string) => {
  try {
    return await api.projects.get(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project.name };
}

export default async function ProjectDetailPage({
  params,
}: {
  // `params` is a promise in this version of Next.js.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  const [tasks, labels] = await Promise.all([
    api.projects.listTasks(id, { limit: 200, sort_by: "created_at", order: "desc" }),
    api.labels.list({ limit: 200 }),
  ]);

  const attachedIds = new Set(project.labels.map((label) => label.id));
  const counts = countTasks(tasks.items);
  const overdue = isOverdue(project.target_date);

  return (
    <>
      <PageHeader
        title={project.name}
        icon={<LayersIcon />}
        breadcrumb={
          <TextLink href="/projects" className="text-small text-fg-subtle hover:text-fg">
            Projects
          </TextLink>
        }
        actions={
          <form action={deleteProjectAction}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="redirect_to_list" value="1" />
            <SubmitButton variant="tertiary" size="small" destructive>
              <TrashIcon size={13} />
              Delete
            </SubmitButton>
          </form>
        }
      />

      <Container className="py-[24px]">
        <div className="flex flex-col gap-[32px] lg:flex-row lg:items-start lg:gap-[40px]">
          {/* ---------------------------------------------------------------
              Content. What the project is, then the work inside it. The edit
              form is folded away at the bottom — it used to sit open in the
              middle of this column, repeating the description and goals
              verbatim in two textareas.
          --------------------------------------------------------------- */}
          <div className="flex min-w-0 flex-1 flex-col gap-[28px]">
            <h1 className="text-title2 font-medium text-fg">{project.name}</h1>

            {project.description ? (
              <p className="max-w-[68ch] text-normal text-fg-muted">{project.description}</p>
            ) : null}

            {project.goals.length > 0 ? (
              <Section heading="Goals">
                <ul className="flex flex-col gap-[2px]">
                  {project.goals.map((goal) => (
                    <li
                      key={goal}
                      className="flex items-start gap-[10px] border-b border-line py-[8px] text-normal text-fg-muted last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[7px] size-[5px] shrink-0 rounded-full bg-fg-faint"
                      />
                      {goal}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section heading={`${tasks.total} ${tasks.total === 1 ? "task" : "tasks"}`}>
              <Disclosure
                summary="New task"
                icon={<PlusIcon size={12} />}
                className="mb-[12px]"
              >
                <Card className="p-[16px]">
                  <TaskForm
                    action={createTaskAction}
                    fixedProjectId={project.id}
                    labels={labels.items}
                    submitLabel="Add task"
                  />
                </Card>
              </Disclosure>

              {tasks.items.length === 0 ? (
                <EmptyState icon={<PlusIcon size={14} />} title="No tasks in this project">
                  Add the first one with the button above.
                </EmptyState>
              ) : (
                <List>
                  {tasks.items.map((task) => {
                    const taskOverdue =
                      Boolean(task.due_date) &&
                      isOverdue(task.due_date) &&
                      task.status !== "done";

                    return (
                      <ListRow key={task.id}>
                        <PriorityIcon priority={task.priority} />

                        <RowTitle
                          href={`/tasks/${task.id}`}
                          className={
                            task.status === "cancelled"
                              ? "text-fg-subtle line-through"
                              : undefined
                          }
                        >
                          {task.name}
                        </RowTitle>

                        <RowControls>
                          <RowMeta
                            tone={taskOverdue ? "critical" : "subtle"}
                            className="w-[76px] text-right"
                          >
                            {formatDueDate(task.due_date)}
                          </RowMeta>

                          <form action={setTaskStatusAction}>
                            <input type="hidden" name="task_id" value={task.id} />
                            <input type="hidden" name="project_id" value={project.id} />
                            {/* This list is not grouped by status, so the row
                                has to say which one it is. */}
                            <StatusSelect
                              name="status"
                              value={task.status}
                              options={TASK_STATUSES}
                              label={`Status for ${task.name}`}
                            />
                          </form>

                          <RowActions>
                            <form action={deleteTaskAction}>
                              <input type="hidden" name="task_id" value={task.id} />
                              <input type="hidden" name="project_id" value={project.id} />
                              <SubmitButton variant="tertiary" size="small" destructive>
                                <TrashIcon size={13} />
                                <span className="sr-only">Delete {task.name}</span>
                              </SubmitButton>
                            </form>
                          </RowActions>
                        </RowControls>
                      </ListRow>
                    );
                  })}
                </List>
              )}
            </Section>

            <Disclosure summary="Edit project" className="border-t border-line pt-[20px]">
              <Card className="p-[16px]">
                <ProjectForm
                  action={updateProjectAction}
                  project={project}
                  submitLabel="Save changes"
                />
              </Card>
            </Disclosure>
          </div>

          {/* ---------------------------------------------------------------
              Rail. Progress first, because it is the question the page is
              opened to answer.
          --------------------------------------------------------------- */}
          <Rail>
            <RailSection heading="Progress">
              <ProgressSummary counts={counts} />
            </RailSection>

            <RailSection heading="Properties">
              <Property label="Priority">
                <PriorityBadge priority={project.priority} />
              </Property>
              <Property label="Start">{formatDate(project.started_date)}</Property>
              <Property label="Target">
                <span className={overdue ? "text-red" : undefined}>
                  {formatDueDate(project.target_date)}
                </span>
              </Property>
            </RailSection>

            {labels.items.length > 0 ? (
              <RailSection heading="Labels">
                <div className="flex flex-wrap items-center gap-[6px] pt-[2px]">
                  {labels.items.map((label) => {
                    const attached = attachedIds.has(label.id);
                    return (
                      <form key={label.id} action={setProjectLabelAction}>
                        <input type="hidden" name="project_id" value={project.id} />
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
          </Rail>
        </div>
      </Container>
    </>
  );
}
