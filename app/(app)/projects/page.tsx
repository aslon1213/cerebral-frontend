import { LabelChips, PRIORITY_LABEL, PriorityIcon } from "@/app/_components/badges";
import { FilterForm } from "@/app/_components/form-ui";
import { SubmitButton } from "@/app/_components/form-ui";
import { LayersIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/_components/icons";
import {
  List,
  ListRow,
  RowActions,
  RowControls,
  RowMeta,
  RowTitle,
  Toolbar,
} from "@/app/_components/list";
import { ProjectForm } from "@/app/_components/project-form";
import { countTasks, ProgressMeter } from "@/app/_components/progress";
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
import { createProjectAction, deleteProjectAction } from "@/app/actions/projects";
import { api } from "@/lib/api/server";
import { formatDueDate, isOverdue } from "@/lib/format";
import { PRIORITIES, type Priority, type ProjectSort } from "@/lib/api/types";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    priority?: string;
    sort_by?: string;
    new?: string;
  }>;
}) {
  const filters = await searchParams;
  const priority = PRIORITIES.includes(filters.priority as Priority)
    ? (filters.priority as Priority)
    : undefined;

  // Both reads are independent — fire them together rather than in sequence.
  const [page, labels] = await Promise.all([
    api.projects.list({
      q: filters.q || undefined,
      priority,
      sort_by: (filters.sort_by as ProjectSort) || "created_at",
      order: "desc",
      limit: 100,
    }),
    api.labels.list({ limit: 200 }),
  ]);

  /*
    Progress is the whole point of the projects list, and the API has no
    per-project task counts, so the tasks are fetched alongside — one request
    per project, all in flight at once. Bounded by the page size above; if that
    limit ever rises past a hundred or so this wants a counts endpoint instead.
  */
  const progress = await Promise.all(
    page.items.map(async (project) => {
      const tasks = await api.projects.listTasks(project.id, { limit: 200 });
      return [project.id, countTasks(tasks.items)] as const;
    }),
  );
  const progressByProject = new Map(progress);

  const hasFilters = Boolean(filters.q || filters.priority);

  return (
    <>
      <PageHeader
        title="Projects"
        icon={<LayersIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "project" : "projects"}
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
              placeholder="Search projects…"
              aria-label="Search projects"
              className="w-[220px] pl-[28px]"
            />
          </span>
          <Select
            name="priority"
            density="compact"
            defaultValue={filters.priority ?? ""}
            aria-label="Filter by priority"
            className="w-[150px]"
          >
            <option value="">Any priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABEL[value]}
              </option>
            ))}
          </Select>
          {hasFilters ? (
            <TextLink
              href="/projects"
              className="px-[4px] text-mini text-fg-subtle hover:text-fg"
            >
              Clear
            </TextLink>
          ) : null}
        </FilterForm>
      </Toolbar>

      <Container className="flex flex-col gap-[16px] py-[20px]">
        <Disclosure
          summary="New project"
          icon={<PlusIcon size={12} />}
          open={filters.new === "1"}
        >
          <Card className="p-[16px]">
            <ProjectForm
              action={createProjectAction}
              labels={labels.items}
              submitLabel="Create project"
            />
          </Card>
        </Disclosure>

        {page.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchIcon size={15} />}
              title="No projects match those filters"
              action={
                <TextLink href="/projects" className="text-small text-brand-ring">
                  Clear filters
                </TextLink>
              }
            >
              Try a broader search, or a different priority.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<LayersIcon size={15} />}
              title="No projects yet"
              action={
                <TextLink href="/projects?new=1" className="text-small text-brand-ring">
                  Create your first project
                </TextLink>
              }
            >
              A project holds a set of tasks and the dates you are working to.
            </EmptyState>
          )
        ) : (
          <List>
            {page.items.map((project) => {
              const counts = progressByProject.get(project.id);
              // A target date that has already passed is the one thing on this
              // row worth interrupting for; it used to read exactly like a date
              // six months out.
              const overdue = isOverdue(project.target_date);

              return (
                <ListRow key={project.id}>
                  <PriorityIcon priority={project.priority} />

                  <RowTitle href={`/projects/${project.id}`}>{project.name}</RowTitle>

                  <RowControls>
                    <LabelChips
                      labels={project.labels}
                      className="hidden md:inline-flex"
                    />

                    {counts ? <ProgressMeter counts={counts} /> : null}

                    <RowMeta
                      tone={overdue ? "critical" : "subtle"}
                      className="w-[76px] text-right"
                    >
                      {formatDueDate(project.target_date)}
                    </RowMeta>

                    <RowActions>
                      <form action={deleteProjectAction}>
                        <input type="hidden" name="project_id" value={project.id} />
                        <SubmitButton variant="tertiary" size="small" destructive>
                          <TrashIcon size={13} />
                          <span className="sr-only">Delete {project.name}</span>
                        </SubmitButton>
                      </form>
                    </RowActions>
                  </RowControls>
                </ListRow>
              );
            })}
          </List>
        )}
      </Container>
    </>
  );
}
