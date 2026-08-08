import { notFound } from "next/navigation";
import { cache } from "react";

import { LabelToggle, PriorityBadge, StatusBadge } from "@/app/_components/badges";
import { SubmitButton } from "@/app/_components/form-ui";
import { IssuesIcon, TrashIcon } from "@/app/_components/icons";
import { TaskForm } from "@/app/_components/task-form";
import {
  Card,
  Container,
  Disclosure,
  PageHeader,
  Property,
  Rail,
  RailSection,
  TextLink,
} from "@/app/_components/ui";
import { deleteTaskAction, setTaskLabelAction, updateTaskAction } from "@/app/actions/tasks";
import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import { formatDate, formatDueDate, isOverdue } from "@/lib/format";

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

  const [project, labels] = await Promise.all([
    api.projects.get(task.project_id),
    api.labels.list({ limit: 200 }),
  ]);

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
