import { notFound } from "next/navigation";

import { DeleteRun } from "@/app/_components/delete-run";
import { InterventionCard } from "@/app/_components/intervention-card";
import { JsonView } from "@/app/_components/json-view";
import { RunsIcon } from "@/app/_components/icons";
import {
  AttemptBadge,
  CommitSha,
  ExecutionStatusBadge,
} from "@/app/_components/run-badges";
import { Transcript } from "@/app/_components/transcript";
import {
  Banner,
  Card,
  Container,
  PageHeader,
  Property,
  Rail,
  RailSection,
  Section,
  TextLink,
} from "@/app/_components/ui";
import { ApiError } from "@/lib/api/errors";
import { api } from "@/lib/api/server";
import {
  formatCost,
  formatCount,
  formatDuration,
  formatExact,
  formatRelative,
} from "@/lib/format";
import { describeResolution } from "@/lib/intervention-outcome";
import { loadRunContext } from "@/lib/run-context";
import { executionPhase } from "@/lib/api/types";

export const metadata = { title: "Run" };

/** One page of transcript to start with; the rest is paged in from the client. */
const FIRST_PAGE = 100;

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resolved?: string; verb?: string }>;
}) {
  const { id } = await params;
  const { resolved, verb } = await searchParams;

  const execution = await loadExecution(id);

  const [events, changes, interventions, context] = await Promise.all([
    api.executions.events(id, { after_seq: 0, limit: FIRST_PAGE }),
    api.executions.changes(id, { limit: 200 }),
    api.executions.interventions(id, { status: "pending", limit: 20 }),
    loadRunContext(execution),
  ]);

  const outcome = resolved && verb ? await describeResolution(resolved, verb) : null;
  const repos = await loadRepoNames(execution.repos.map((repo) => repo.repo_id));
  const blocked = executionPhase(execution.status) === "blocked";

  return (
    <>
      <PageHeader
        icon={<RunsIcon />}
        breadcrumb={
          <TextLink
            href="/runs"
            className="shrink-0 text-small text-fg-subtle hover:text-fg"
          >
            Runs
          </TextLink>
        }
        title={context.taskName ?? "Run"}
        actions={<ExecutionStatusBadge status={execution.status} />}
      />

      <Container className="flex flex-col gap-[20px] py-[20px] lg:flex-row lg:items-start lg:gap-[28px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          {outcome ? (
            <div className="rounded-input border border-green/35 bg-green/8 px-[13px] py-[10px] text-small text-fg-muted">
              {outcome}
            </div>
          ) : null}

          {/*
            What the run is stuck on comes before its transcript. Anything else
            puts the history of a stopped run above the one thing that would
            start it again.
          */}
          {interventions.items.length > 0 ? (
            <Section heading={`Waiting on you (${interventions.total})`}>
              <div className="flex flex-col gap-[12px]">
                {interventions.items.map((intervention) => (
                  <InterventionCard
                    key={intervention.id}
                    intervention={intervention}
                    returnTo={`/runs/${id}`}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {execution.error ? (
            <Banner tone="critical" heading={`Failed — ${execution.error.code}`}>
              {execution.error.message}
              {execution.error.retryable
                ? " This one is marked retryable, so running the task again is worth trying."
                : " This is not marked retryable; running it again is likely to fail the same way."}
            </Banner>
          ) : null}

          <Section heading="Transcript">
            <Transcript
              executionId={id}
              initialEvents={events.items}
              initialCursor={events.next_after_seq}
              initialHasMore={events.has_more}
              initialChanges={changes.items}
              status={execution.status}
            />
          </Section>

          {execution.result && Object.keys(execution.result).length > 0 ? (
            <Section heading="Result">
              <Card className="px-[14px] py-[12px]">
                <JsonView data={execution.result} />
              </Card>
            </Section>
          ) : null}
        </div>

        <Rail>
          <RailSection heading="Run">
            <Property label="Status">
              <span className="inline-flex items-center gap-[8px]">
                <ExecutionStatusBadge status={execution.status} />
                <AttemptBadge attempt={execution.attempt} />
              </span>
            </Property>
            {context.agentName ? (
              <Property label="Agent">{context.agentName}</Property>
            ) : null}
            {execution.model ? <Property label="Model">{execution.model}</Property> : null}
            {execution.provider ? (
              <Property label="Provider">{execution.provider}</Property>
            ) : null}
            {context.taskName ? (
              <Property label="Task">
                <TextLink
                  href={`/tasks/${execution.task_id}`}
                  className="text-fg-muted hover:text-brand-ring"
                >
                  {context.taskName}
                </TextLink>
              </Property>
            ) : null}
            {blocked ? (
              <Property label="Blocked">
                <TextLink href="/inbox" className="text-orange hover:text-orange">
                  Answer in the inbox →
                </TextLink>
              </Property>
            ) : null}
          </RailSection>

          <RailSection heading="Timing">
            <Property label="Created">
              <span title={formatExact(execution.created_at)}>
                {formatRelative(execution.created_at)}
              </span>
            </Property>
            {execution.started_at ? (
              <Property label="Started">
                <span title={formatExact(execution.started_at)}>
                  {formatRelative(execution.started_at)}
                </span>
              </Property>
            ) : null}
            {execution.finished_at ? (
              <>
                <Property label="Finished">
                  <span title={formatExact(execution.finished_at)}>
                    {formatRelative(execution.finished_at)}
                  </span>
                </Property>
                <Property label="Took">
                  {formatDuration(execution.started_at, execution.finished_at)}
                </Property>
              </>
            ) : null}
          </RailSection>

          <RailSection heading="Usage">
            <Property label="Input">{formatCount(execution.input_tokens)}</Property>
            <Property label="Output">{formatCount(execution.output_tokens)}</Property>
            <Property label="Cache read">
              {formatCount(execution.cache_read_tokens)}
            </Property>
            <Property label="Cost">{formatCost(execution.cost_usd)}</Property>
          </RailSection>

          {/*
            Git state, which only the detail endpoint carries — the list view
            deliberately omits it rather than fanning out a query per row.
          */}
          {execution.repos.length > 0 ? (
            <RailSection heading="Git">
              {execution.repos.map((repo) => (
                <div key={repo.repo_id} className="flex flex-col gap-[2px] pt-[4px]">
                  <TextLink
                    href={`/repos/${repo.repo_id}`}
                    className="text-small text-fg hover:text-brand-ring"
                  >
                    {repos.get(repo.repo_id) ?? "repo"}
                  </TextLink>
                  <Property label="Base">
                    <CommitSha sha={repo.base_commit_sha} label="Base commit" />
                  </Property>
                  {repo.head_commit_sha ? (
                    <Property label="Head">
                      <CommitSha sha={repo.head_commit_sha} label="Head commit" />
                    </Property>
                  ) : null}
                  {repo.landed_at ? (
                    <>
                      <Property label="Landed on">{repo.landed_branch}</Property>
                      {repo.merge_commit_sha ? (
                        <Property label="Merge">
                          <CommitSha sha={repo.merge_commit_sha} label="Merge commit" />
                        </Property>
                      ) : null}
                      <Property label="Landed">
                        <span title={formatExact(repo.landed_at)}>
                          {formatRelative(repo.landed_at)}
                        </span>
                      </Property>
                    </>
                  ) : (
                    /*
                      Agents commit under refs/cerebral/executions/<id>, outside
                      refs/heads/*. Until the run lands, none of this is visible
                      to normal git tooling — worth stating rather than leaving
                      as a blank.
                    */
                    <p className="pt-[4px] text-mini leading-[16px] text-fg-faint">
                      Not landed. Its commits live in{" "}
                      <span className="font-mono">{repo.ref_name}</span>, outside{" "}
                      <span className="font-mono">refs/heads/*</span>, so ordinary git
                      tooling cannot see them yet.
                    </p>
                  )}
                </div>
              ))}
            </RailSection>
          ) : null}

          <RailSection heading="Danger zone">
            <DeleteRun executionId={id} />
          </RailSection>
        </Rail>
      </Container>
    </>
  );
}

/** A 404 here may equally mean "not yours" — say neither, just show not-found. */
async function loadExecution(id: string) {
  try {
    return await api.executions.get(id);
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) notFound();
    throw error;
  }
}

async function loadRepoNames(ids: string[]) {
  const unique = [...new Set(ids)];
  const results = await Promise.all(
    unique.map(async (repoId) => {
      try {
        return await api.repos.get(repoId);
      } catch {
        return null;
      }
    }),
  );
  return new Map(
    results.flatMap((repo) => (repo ? [[repo.id, repo.name] as const] : [])),
  );
}
