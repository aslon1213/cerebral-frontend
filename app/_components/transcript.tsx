"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { fetchTranscriptAction } from "@/app/actions/executions";
import { formatExact, formatRelative } from "@/lib/format";
import { ACTOR_LABEL, EVENT_TYPE_LABEL } from "@/lib/vocabulary";
import {
  isExecutionLive,
  type CodeChangeResponse,
  type ExecutionEventResponse,
  type ExecutionStatus,
} from "@/lib/api/types";

import { ChangeTypeGlyph, CommitSha, DiffStat, LandedBadge } from "./run-badges";
import { ChevronIcon, TextLink, cx } from "./ui";
import { JsonView } from "./json-view";

/** How often a live run is asked for anything new. */
const POLL_MS = 4000;

/**
 * The transcript, and the main view of a run rather than a tab behind it.
 *
 * Two things make this a client component rather than a server-rendered list.
 * A live run has to be tailed — and tailing is exactly what the cursor is for:
 * ask again with the `next_after_seq` already held, and an empty page means
 * caught up. And a long transcript pages forward without losing what is already
 * on screen, which an offset-paginated URL could not do.
 */
export function Transcript({
  executionId,
  initialEvents,
  initialCursor,
  initialHasMore,
  initialChanges,
  status,
}: {
  executionId: string;
  initialEvents: ExecutionEventResponse[];
  initialCursor: number | null;
  initialHasMore: boolean;
  initialChanges: CodeChangeResponse[];
  status: ExecutionStatus;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [changes, setChanges] = useState(initialChanges);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [liveStatus, setLiveStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Guards against two loads racing — a poll firing while "Load more" is still
  // in flight would apply the same cursor twice.
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current || cursor === null) return;
    loading.current = true;
    try {
      const chunk = await fetchTranscriptAction(executionId, cursor);
      setError(null);
      setLiveStatus(chunk.status);
      if (chunk.changes.length > 0) setChanges(chunk.changes);

      if (chunk.events.length > 0) {
        setEvents((current) => {
          // `seq` is unique within a run, so it is the identity to dedupe on.
          const seen = new Set(current.map((event) => event.seq));
          const fresh = chunk.events.filter((event) => !seen.has(event.seq));
          return fresh.length === 0 ? current : [...current, ...fresh];
        });
        setCursor(chunk.nextAfterSeq);
      }
      setHasMore(chunk.hasMore);
    } catch {
      setError("Could not reach the API. Still trying.");
    } finally {
      loading.current = false;
    }
  }, [cursor, executionId]);

  const live = isExecutionLive(liveStatus);

  /*
    Poll only while the run can still produce events. A terminal run never
    changes again, so polling it is pure waste — and this is the whole reason
    the status comes back with every chunk.
  */
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => startTransition(() => void load()), POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  const byParent = groupByParent(events);
  const changesByEvent = groupChanges(changes);
  const roots = events.filter((event) => event.parent_event_id === null);

  return (
    <section className="flex flex-col gap-[2px]">
      {events.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line-strong px-[16px] py-[24px] text-center text-small text-fg-subtle">
          Nothing has been recorded on this run yet.
        </p>
      ) : null}

      {roots.map((event) => (
        <EventBlock
          key={event.id}
          event={event}
          results={byParent.get(event.id) ?? []}
          changesByEvent={changesByEvent}
        />
      ))}

      <div className="flex items-center justify-center gap-[10px] pt-[12px]">
        {error ? <span className="text-mini text-red">{error}</span> : null}

        {hasMore ? (
          <button
            type="button"
            onClick={() => startTransition(() => void load())}
            disabled={isPending}
            className="cursor-pointer rounded-control border border-line-strong bg-control px-[12px] py-[5px] text-mini text-fg-muted shadow-control transition-colors duration-100 hover:bg-control-hover hover:text-fg disabled:opacity-60"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        ) : live ? (
          /* Says why the page is quiet: it is caught up, not broken. */
          <span className="inline-flex items-center gap-[7px] text-mini text-fg-subtle">
            <span className="size-[6px] animate-pulse rounded-full bg-yellow" />
            Live — checking every {POLL_MS / 1000}s
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** `tool_result` events hang off their `tool_call` rather than standing alone. */
function groupByParent(events: ExecutionEventResponse[]) {
  const map = new Map<string, ExecutionEventResponse[]>();
  for (const event of events) {
    if (event.parent_event_id === null) continue;
    const siblings = map.get(event.parent_event_id);
    if (siblings) siblings.push(event);
    else map.set(event.parent_event_id, [event]);
  }
  return map;
}

function groupChanges(changes: CodeChangeResponse[]) {
  const map = new Map<string, CodeChangeResponse[]>();
  for (const change of changes) {
    const existing = map.get(change.event_id);
    if (existing) existing.push(change);
    else map.set(change.event_id, [change]);
  }
  return map;
}

/** The rail colour for who is speaking. */
const ACTOR_ACCENT: Record<string, string> = {
  agent: "bg-brand/60",
  user: "bg-blue/60",
  system: "bg-line-strong",
};

function EventBlock({
  event,
  results,
  changesByEvent,
}: {
  event: ExecutionEventResponse;
  /** The `tool_result` events that name this one as their parent. */
  results: ExecutionEventResponse[];
  changesByEvent: Map<string, CodeChangeResponse[]>;
}) {
  /*
    A status change is not something anyone said — it is the machine noting a
    transition. It gets a rule across the column rather than a voice.
  */
  if (event.event_type === "status_change") {
    return <StatusRule event={event} />;
  }

  const fromUser = event.actor_type === "user";

  return (
    <article
      className={cx(
        "flex gap-[12px] px-[2px] py-[10px]",
        // Who is speaking decides the side, so the person's own words read as
        // an interjection into the agent's stream rather than part of it.
        fromUser && "flex-row-reverse",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "mt-[6px] w-[2px] shrink-0 self-stretch rounded-full",
          ACTOR_ACCENT[event.actor_type] ?? ACTOR_ACCENT.system,
        )}
      />

      <div className={cx("flex min-w-0 flex-1 flex-col gap-[6px]", fromUser && "items-end")}>
        <header
          className={cx(
            "flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]",
            fromUser && "flex-row-reverse",
          )}
        >
          <span className="text-mini leading-[16px] font-medium text-fg-muted">
            {ACTOR_LABEL[event.actor_type]}
          </span>
          <span className="text-micro leading-[16px] text-fg-faint">
            {EVENT_TYPE_LABEL[event.event_type]}
          </span>
          <time
            dateTime={event.created_at}
            title={formatExact(event.created_at)}
            className="text-micro leading-[16px] text-fg-faint"
          >
            {formatRelative(event.created_at)}
          </time>
          {event.cerebral_commit_sha ? (
            <CommitSha
              sha={event.cerebral_commit_sha}
              label="Agent commit (private ref)"
              className="text-micro"
            />
          ) : null}
        </header>

        <div className={cx("w-full min-w-0", fromUser && "flex flex-col items-end")}>
          <EventBody event={event} changes={changesByEvent.get(event.id) ?? []} />

          {results.length > 0 ? (
            <div className="mt-[6px] flex w-full flex-col gap-[6px] border-l border-line pl-[12px]">
              {results.map((result) => (
                <ToolResult key={result.id} event={result} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EventBody({
  event,
  changes,
}: {
  event: ExecutionEventResponse;
  changes: CodeChangeResponse[];
}) {
  const { reasoning, data } = event.payload;
  const hasData = data && Object.keys(data).length > 0;

  switch (event.event_type) {
    /*
      What someone actually said. Given a surface so it reads as speech, and the
      one thing on the page allowed to look like a message.
    */
    case "chat_message":
      return (
        <p
          className={cx(
            "inline-block max-w-[62ch] rounded-panel px-[13px] py-[9px] text-small whitespace-pre-wrap",
            event.actor_type === "user"
              ? "bg-brand-wash text-fg"
              : "bg-surface text-fg-muted",
          )}
        >
          {stringField(data, "text") ?? reasoning ?? "—"}
        </p>
      );

    /*
      The reasoning is the product's whole claim, so it is set as prose at
      reading width — not squeezed into a metadata row or hidden behind a
      disclosure.
    */
    case "reasoning":
      return (
        <p className="max-w-[76ch] text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
          {reasoning ?? "—"}
        </p>
      );

    case "decision":
      return (
        <div className="flex max-w-[76ch] flex-col gap-[8px]">
          {reasoning ? (
            <p className="text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
              {reasoning}
            </p>
          ) : null}
          {hasData ? (
            <div className="rounded-input border border-line bg-surface px-[12px] py-[9px]">
              <JsonView data={data} />
            </div>
          ) : null}
        </div>
      );

    // A tool call is machinery. It collapses so it never outweighs the prose.
    case "tool_call":
      return (
        <div className="flex max-w-[76ch] flex-col gap-[6px]">
          {reasoning ? (
            <p className="text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
              {reasoning}
            </p>
          ) : null}
          <Collapsible summary={toolSummary(data)} open={false}>
            <JsonView data={data} />
          </Collapsible>
        </div>
      );

    case "code_change":
      return (
        <div className="flex max-w-[76ch] flex-col gap-[8px]">
          {reasoning ? (
            <p className="text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
              {reasoning}
            </p>
          ) : null}
          {changes.length > 0 ? (
            <ul className="flex list-none flex-col gap-[1px] overflow-hidden rounded-input border border-line">
              {changes.map((change) => (
                <ChangeRow key={change.id} change={change} />
              ))}
            </ul>
          ) : null}
        </div>
      );

    default:
      return (
        <div className="flex max-w-[76ch] flex-col gap-[6px]">
          {reasoning ? (
            <p className="text-small leading-[20px] whitespace-pre-wrap text-fg-muted">
              {reasoning}
            </p>
          ) : null}
          {hasData ? (
            <div className="rounded-input border border-line bg-surface px-[12px] py-[9px]">
              <JsonView data={data} />
            </div>
          ) : null}
        </div>
      );
  }
}

/** A result, folded away under the call that produced it. */
function ToolResult({ event }: { event: ExecutionEventResponse }) {
  const { data, reasoning } = event.payload;
  const ok = data?.ok;
  const failed = ok === false;

  return (
    <div className="flex flex-col gap-[4px]">
      <Collapsible
        summary={
          <span className="inline-flex items-center gap-[7px]">
            <span
              aria-hidden="true"
              className={cx(
                "size-[6px] shrink-0 rounded-full",
                failed ? "bg-red" : ok === true ? "bg-green" : "bg-fg-faint",
              )}
            />
            {EVENT_TYPE_LABEL[event.event_type]}
            {failed ? <span className="text-red">failed</span> : null}
          </span>
        }
        open={failed}
      >
        {reasoning ? (
          <p className="mb-[6px] text-small whitespace-pre-wrap text-fg-muted">{reasoning}</p>
        ) : null}
        <JsonView data={data ?? {}} />
      </Collapsible>
    </div>
  );
}

function ChangeRow({ change }: { change: CodeChangeResponse }) {
  return (
    <li className="flex flex-wrap items-center gap-[10px] bg-surface px-[11px] py-[7px]">
      <ChangeTypeGlyph type={change.change_type} />
      <TextLink
        href={`/repos/${change.repo_id}?path=${encodeURIComponent(change.path)}`}
        className="min-w-0 flex-1 truncate font-mono text-mini leading-[16px] text-fg-muted hover:text-brand-ring"
      >
        {change.previous_path ? `${change.previous_path} → ${change.path}` : change.path}
      </TextLink>
      <DiffStat added={change.lines_added} deleted={change.lines_deleted} />
      <LandedBadge sha={change.landed_commit_sha} />
    </li>
  );
}

function StatusRule({ event }: { event: ExecutionEventResponse }) {
  const from = stringField(event.payload.data, "from");
  const to = stringField(event.payload.data, "to");

  return (
    <div className="flex items-center gap-[10px] py-[10px]">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="shrink-0 text-micro leading-[16px] text-fg-faint">
        {from && to ? `${from} → ${to}` : EVENT_TYPE_LABEL[event.event_type]}
        {" · "}
        {formatRelative(event.created_at)}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}

/**
 * `<details>` rather than React state: it works before hydration, it is a real
 * disclosure to a screen reader, and `open` can be decided by the caller.
 */
function Collapsible({
  summary,
  open,
  children,
}: {
  summary: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group rounded-input border border-line bg-surface">
      <summary className="flex cursor-pointer items-center gap-[8px] px-[11px] py-[7px] text-mini leading-[16px] text-fg-subtle transition-colors duration-100 hover:text-fg">
        <ChevronIcon className="shrink-0 transition-transform duration-150 group-open:rotate-180" />
        <span className="min-w-0 truncate">{summary}</span>
      </summary>
      <div className="border-t border-line px-[11px] py-[9px]">{children}</div>
    </details>
  );
}

/** `read_file app/auth.py` — the call said the way it would be typed. */
function toolSummary(data: Record<string, unknown>): string {
  const tool = stringField(data, "tool") ?? "tool call";
  const args = data.arguments;
  if (args && typeof args === "object" && !Array.isArray(args)) {
    const first = Object.values(args as Record<string, unknown>).find(
      (value) => typeof value === "string" || typeof value === "number",
    );
    if (first !== undefined) return `${tool} ${String(first)}`;
  }
  return tool;
}

function stringField(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value : undefined;
}
