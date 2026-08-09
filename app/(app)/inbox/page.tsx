import type { Metadata } from "next";

import { InterventionCard } from "@/app/_components/intervention-card";
import { InboxIcon } from "@/app/_components/icons";
import {
  Container,
  EmptyState,
  LinkButton,
  PageHeader,
  TextLink,
} from "@/app/_components/ui";
import { api } from "@/lib/api/server";
import { describeResolution } from "@/lib/intervention-outcome";
import { loadRunContexts } from "@/lib/run-context";
import type { ExecutionResponse, UUID } from "@/lib/api/types";

export const metadata: Metadata = { title: "Inbox" };

/**
 * The home screen, and the only one with any urgency.
 *
 * `GET /interventions` is everything waiting on the signed-in user across every
 * run, oldest first — the agent blocked longest is losing the most time, so it
 * is the one at the top. Each item is answerable here, without opening its run,
 * because opening the run to press Approve is the cost this screen exists to
 * remove.
 */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ resolved?: string; verb?: string }>;
}) {
  const { resolved, verb } = await searchParams;
  const pending = await api.interventions.list({ limit: 50 });

  // Set by the resolve action's redirect. Reporting it here rather than in the
  // card is what lets it say whether the run actually came unblocked — by then
  // the item is no longer pending, so its card is gone.
  const outcome = resolved && verb ? await describeResolution(resolved, verb) : null;

  // Every intervention names a run but nothing a person recognises. Resolve the
  // runs once for the whole page rather than per card.
  const executions = await loadExecutions(
    pending.items.map((intervention) => intervention.execution_id),
  );
  const contexts = await loadRunContexts([...executions.values()]);

  return (
    <>
      <PageHeader
        icon={<InboxIcon />}
        title="Inbox"
        actions={
          pending.total > 0 ? (
            <span className="text-mini leading-[16px] text-fg-subtle">
              {pending.total} waiting
            </span>
          ) : null
        }
      />

      <Container className="flex flex-col gap-[14px] py-[20px]">
        {outcome ? (
          <div className="flex flex-wrap items-center gap-[12px] rounded-input border border-green/35 bg-green/8 px-[13px] py-[10px]">
            <p className="min-w-0 flex-1 text-small text-fg-muted">{outcome}</p>
            <TextLink
              href={`/runs/${resolved}`}
              className="shrink-0 text-mini leading-[16px] text-fg-subtle underline decoration-line-input underline-offset-2"
            >
              Open the run
            </TextLink>
          </div>
        ) : null}

        {pending.items.length === 0 ? (
          <EmptyState
            icon={<InboxIcon />}
            title="Nothing is waiting on you"
            action={
              <LinkButton href="/runs" variant="secondary" size="small">
                See all runs
              </LinkButton>
            }
          >
            When an agent needs permission, a review, or an answer, it appears here
            and its run stops until you deal with it.
          </EmptyState>
        ) : (
          <>
            <p className="text-small text-fg-subtle">
              Oldest first — the agent at the top has been blocked the longest.
            </p>
            {pending.items.map((intervention) => {
              const execution = executions.get(intervention.execution_id);
              const context = contexts.get(intervention.execution_id);

              return (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  context={{
                    taskName: context?.taskName,
                    projectName: context?.projectName,
                    attempt: execution?.attempt,
                  }}
                />
              );
            })}
          </>
        )}
      </Container>
    </>
  );
}

/**
 * Fetch each distinct run behind the pending items.
 *
 * A run that has since been deleted, or was never the caller's, simply drops
 * out — the intervention still renders, just without the line naming its task.
 */
async function loadExecutions(ids: UUID[]): Promise<Map<UUID, ExecutionResponse>> {
  const unique = [...new Set(ids)];
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        return await api.executions.get(id);
      } catch {
        return null;
      }
    }),
  );

  return new Map(
    results.flatMap((execution) => (execution ? [[execution.id, execution] as const] : [])),
  );
}
