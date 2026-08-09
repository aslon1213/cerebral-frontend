import { notFound } from "next/navigation";

import { FilterForm } from "@/app/_components/form-ui";
import { CodeIcon, RepoIcon, SearchIcon } from "@/app/_components/icons";
import { Pagination, Toolbar } from "@/app/_components/list";
import { RepoForm } from "@/app/_components/repo-form";
import {
  AttemptBadge,
  ChangeTypeGlyph,
  CommitSha,
  DiffStat,
  LandedBadge,
} from "@/app/_components/run-badges";
import {
  Card,
  Container,
  Disclosure,
  EmptyState,
  Input,
  PageHeader,
  Rail,
  RailSection,
  TextLink,
  cx,
} from "@/app/_components/ui";
import { updateRepoAction } from "@/app/actions/repos";
import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import { formatExact, formatRelative } from "@/lib/format";
import { CHANGE_TYPE_LABEL } from "@/lib/vocabulary";
import type { CodeChangeHistoryEntry, UUID } from "@/lib/api/types";

const PAGE_SIZE = 25;

/** The file index is built from this many recent changes. */
const INDEX_DEPTH = 200;

export const metadata = { title: "Repo" };

/**
 * The question the product exists to answer.
 *
 * Someone opens a file, finds a line nobody understands, and this screen says
 * which agent wrote it, on which attempt, and — beside it — the reasoning that
 * produced it. So the reasoning is given the room, not relegated to a tooltip
 * on a row of statistics.
 */
export default async function RepoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path?: string; offset?: string }>;
}) {
  const { id } = await params;
  const { path, offset: rawOffset } = await searchParams;
  const offset = Math.max(0, Number(rawOffset ?? 0) || 0);

  const repo = await loadRepo(id);

  const [history, index] = await Promise.all([
    api.repos.history(id, { path: path || undefined, limit: PAGE_SIZE, offset }),
    // Unfiltered, so the file list stays put while a path filter is applied.
    api.repos.history(id, { limit: INDEX_DEPTH }),
  ]);

  const agents = await loadAgentNames(
    history.items.map((entry) => entry.executor_agent_id),
  );

  // Which files this repo's agents have touched, most-changed first.
  const files = new Map<string, number>();
  for (const entry of index.items) {
    files.set(entry.change.path, (files.get(entry.change.path) ?? 0) + 1);
  }
  const fileList = [...files.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <>
      <PageHeader
        icon={<RepoIcon />}
        breadcrumb={
          <TextLink href="/repos" className="shrink-0 text-small text-fg-subtle hover:text-fg">
            Repos
          </TextLink>
        }
        title={repo.name}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {history.total} {history.total === 1 ? "change" : "changes"}
          </span>
        }
      />

      <Toolbar>
        <FilterForm className="flex flex-1 flex-wrap items-center gap-[8px]">
          <span className="relative flex items-center">
            <SearchIcon size={13} className="pointer-events-none absolute left-[9px] text-fg-faint" />
            <Input
              name="path"
              density="compact"
              defaultValue={path ?? ""}
              placeholder="Filter to a file path…"
              aria-label="Filter by file path"
              className="w-[280px] pl-[28px] font-mono"
            />
          </span>
          {path ? (
            <TextLink
              href={`/repos/${id}`}
              className="px-[4px] text-mini text-fg-subtle hover:text-fg"
            >
              Clear
            </TextLink>
          ) : null}
        </FilterForm>
      </Toolbar>

      <Container className="flex flex-col gap-[20px] py-[20px] lg:flex-row lg:items-start lg:gap-[28px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
          {path ? (
            <p className="text-small text-fg-subtle">
              Every agent change to <span className="font-mono text-fg-muted">{path}</span>,
              newest first.
            </p>
          ) : null}

          {history.items.length === 0 ? (
            <EmptyState
              icon={<CodeIcon size={15} />}
              title={path ? "No changes to that path" : "No code changes recorded"}
              action={
                path ? (
                  <TextLink href={`/repos/${id}`} className="text-small text-brand-ring">
                    Show the whole repo
                  </TextLink>
                ) : undefined
              }
            >
              {path
                ? "Check the spelling — the filter matches the path an agent recorded, exactly."
                : "Once an agent records a change against this repo, it appears here beside the reasoning that produced it."}
            </EmptyState>
          ) : null}

          {history.items.map((entry) => (
            <HistoryEntry
              key={entry.change.id}
              entry={entry}
              repoId={id}
              agentName={
                entry.executor_agent_id ? agents.get(entry.executor_agent_id) : undefined
              }
            />
          ))}

          <Pagination
            total={history.total}
            limit={PAGE_SIZE}
            offset={offset}
            params={{ path }}
            basePath={`/repos/${id}`}
          />
        </div>

        <Rail>
          <RailSection heading="Repo">
            <dl className="flex flex-col gap-[6px] text-small">
              <div className="flex flex-col gap-[2px]">
                <dt className="text-mini leading-[16px] text-fg-subtle">Local path</dt>
                <dd className="font-mono text-mini leading-[16px] break-all text-fg-muted">
                  {repo.local_path}
                </dd>
              </div>
              <div className="flex flex-col gap-[2px]">
                <dt className="text-mini leading-[16px] text-fg-subtle">Default branch</dt>
                <dd className="font-mono text-mini leading-[16px] text-fg-muted">
                  {repo.default_branch}
                </dd>
              </div>
              {repo.remote_url ? (
                <div className="flex flex-col gap-[2px]">
                  <dt className="text-mini leading-[16px] text-fg-subtle">Remote</dt>
                  <dd className="font-mono text-mini leading-[16px] break-all text-fg-muted">
                    {repo.remote_url}
                  </dd>
                </div>
              ) : null}
            </dl>
          </RailSection>

          {fileList.length > 0 ? (
            <RailSection heading="Files touched">
              <ul className="flex list-none flex-col gap-[1px]">
                {fileList.slice(0, 20).map(([filePath, count]) => (
                  <li key={filePath}>
                    <TextLink
                      href={`/repos/${id}?path=${encodeURIComponent(filePath)}`}
                      className={cx(
                        "flex items-center gap-[8px] rounded-control px-[6px] py-[3px] font-mono text-mini leading-[16px]",
                        "transition-colors duration-100 hover:bg-overlay-hover",
                        filePath === path ? "bg-overlay-hover text-fg" : "text-fg-subtle",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{filePath}</span>
                      <span className="shrink-0 tabular-nums text-fg-faint">{count}</span>
                    </TextLink>
                  </li>
                ))}
              </ul>
              {index.total > INDEX_DEPTH ? (
                <p className="pt-[6px] text-micro leading-[16px] text-fg-faint">
                  From the {INDEX_DEPTH} most recent changes of {index.total}.
                </p>
              ) : null}
            </RailSection>
          ) : null}

          <RailSection heading="Settings">
            <Disclosure summary="Edit repo">
              <Card className="p-[14px]">
                <RepoForm action={updateRepoAction} repo={repo} submitLabel="Save" />
              </Card>
            </Disclosure>
          </RailSection>
        </Rail>
      </Container>
    </>
  );
}

/**
 * One change, and why.
 *
 * Deliberately not a diff. The API serves git coordinates — blob ids and a path
 * — never file content, so there is no patch to render and nothing here pretends
 * otherwise. What it can say is what changed, by how much, whether it reached
 * the default branch, and the agent's own account of the decision.
 */
function HistoryEntry({
  entry,
  repoId,
  agentName,
}: {
  entry: CodeChangeHistoryEntry;
  repoId: UUID;
  agentName?: string;
}) {
  const { change, event, attempt } = entry;

  return (
    <article className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
      <header className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] border-b border-line px-[14px] py-[9px]">
        <ChangeTypeGlyph type={change.change_type} />
        <TextLink
          href={`/repos/${repoId}?path=${encodeURIComponent(change.path)}`}
          className="min-w-0 flex-1 truncate font-mono text-small text-fg hover:text-brand-ring"
        >
          {change.previous_path ? `${change.previous_path} → ${change.path}` : change.path}
        </TextLink>
        <span className="shrink-0 text-micro leading-[16px] text-fg-faint">
          {CHANGE_TYPE_LABEL[change.change_type]}
        </span>
        <DiffStat added={change.lines_added} deleted={change.lines_deleted} />
        <LandedBadge sha={change.landed_commit_sha} />
      </header>

      {/*
        The change on one side, the reasoning on the other — the whole point of
        the screen.

        Side by side only from `xl`. At `lg` the rail is already taking 264px,
        which leaves the prose about 40 characters a line — narrow enough that
        the reasoning, the thing worth reading, becomes the hardest thing on the
        page to read. Below that they stack, prose first.
      */}
      <div className="flex flex-col gap-[14px] px-[14px] py-[12px] xl:flex-row xl:gap-[20px]">
        <div className="min-w-0 flex-1">
          {event.payload.reasoning ? (
            <p className="max-w-[76ch] text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
              {event.payload.reasoning}
            </p>
          ) : (
            <p className="text-small text-fg-faint">
              The agent recorded no reasoning for this change.
            </p>
          )}

          {/*
            `diff` is an optional cache and is usually null — shown when it
            happens to be there, never depended on.
          */}
          {change.diff && change.diff.length > 0 ? (
            <div className="mt-[10px] flex flex-col gap-[6px]">
              {change.diff.map((hunk, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-input border border-line font-mono text-mini leading-[18px]"
                >
                  <div className="border-b border-line bg-surface-sunken px-[10px] py-[3px] text-micro text-fg-faint">
                    lines {hunk.line_start}–{hunk.line_end}
                  </div>
                  <pre className="overflow-x-auto bg-red/8 px-[10px] py-[5px] text-red">
                    {hunk.old}
                  </pre>
                  <pre className="overflow-x-auto bg-green/8 px-[10px] py-[5px] text-green">
                    {hunk.new}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="flex shrink-0 flex-col gap-[5px] text-mini leading-[16px] xl:w-[200px]">
          <div className="flex items-center gap-[8px]">
            <span className="text-fg-subtle">{agentName ?? "Unknown agent"}</span>
            <AttemptBadge attempt={attempt} />
          </div>
          <time
            dateTime={change.created_at}
            title={formatExact(change.created_at)}
            className="text-fg-faint"
          >
            {formatRelative(change.created_at)}
          </time>

          {/*
            Two commits that are not the same thing: the one that produced the
            change, in the agent's private namespace, and where the run's work
            ended up on the default branch.
          */}
          {event.cerebral_commit_sha ? (
            <span className="flex items-center gap-[6px]">
              <span className="text-fg-faint">wrote</span>
              <CommitSha sha={event.cerebral_commit_sha} label="Agent commit (private ref)" />
            </span>
          ) : null}
          {change.landed_commit_sha ? (
            <span className="flex items-center gap-[6px]">
              <span className="text-fg-faint">landed</span>
              <CommitSha sha={change.landed_commit_sha} label="Landed on the default branch" />
            </span>
          ) : null}

          <TextLink
            href={`/runs/${change.execution_id}`}
            className="mt-[3px] text-fg-subtle hover:text-brand-ring"
          >
            Open the run →
          </TextLink>
        </aside>
      </div>
    </article>
  );
}

async function loadRepo(id: string) {
  try {
    return await api.repos.get(id);
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) notFound();
    throw error;
  }
}

async function loadAgentNames(ids: (UUID | null)[]) {
  const unique = [...new Set(ids.filter((id): id is UUID => id !== null))];
  const results = await Promise.all(
    unique.map(async (agentId) => {
      try {
        return await api.agents.get(agentId);
      } catch {
        return null;
      }
    }),
  );
  return new Map(
    results.flatMap((agent) => (agent ? [[agent.id, agent.name] as const] : [])),
  );
}
