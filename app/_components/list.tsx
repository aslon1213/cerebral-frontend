import Link from "next/link";

import { Container, cx } from "./ui";

/**
 * The issue-list primitives from the library's "Issues" section.
 *
 * A list is a panel of 40px rows separated by hairlines. Each row is one line:
 * glyphs and identifiers lead, the title takes the slack, and metadata plus
 * row actions trail. Hovering lifts the row onto `grey/1F2130`.
 */

export function List({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-panel border border-line bg-surface shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The grouping bar above a run of rows — a status glyph, a name and a count. */
export function ListGroupHeader({
  icon,
  title,
  count,
  action,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[8px] border-b border-line bg-surface-raised px-[16px] py-[7px]">
      {icon}
      <span className="text-small font-medium text-fg">{title}</span>
      {count !== undefined ? (
        <span className="text-small text-fg-subtle">{count}</span>
      ) : null}
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </div>
  );
}

export function ListRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "group relative flex items-center gap-[10px] border-b border-line px-[16px] py-[9px]",
        "transition-colors duration-100 last:border-b-0 hover:bg-surface-hover",
        // Tabbing through the list should light the row up the same way pointing
        // at it does, so keyboard users get the same sense of place.
        "focus-within:bg-surface-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The row's primary link.
 *
 * `before:absolute inset-0` throws an invisible pane across the whole row, so
 * the entire strip is clickable instead of just the few words of the title —
 * while the DOM still holds exactly one link, and the controls that trail the
 * row sit above it on their own stacking context.
 */
export function RowTitle({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      {...props}
      className={cx(
        // `flex-1` is load-bearing: without it the title is the only thing in
        // the row allowed to shrink, and the trailing chips and dates squeeze
        // it to nothing long before the viewport gets narrow.
        "min-w-0 flex-1 truncate text-normal text-fg no-underline transition-colors duration-100",
        "before:absolute before:inset-0 before:content-['']",
        "hover:text-brand-ring",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Anything interactive that trails the title has to be lifted above the row's
 * click pane, or the pane swallows it.
 */
export function RowControls({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative z-[1] ml-auto flex shrink-0 items-center gap-[10px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Trailing metadata — the dates and counts at the right edge of a row. */
export function RowMeta({
  children,
  tone = "subtle",
  className,
}: {
  children: React.ReactNode;
  tone?: "subtle" | "critical";
  className?: string;
}) {
  return (
    <span
      className={cx(
        "shrink-0 text-mini leading-[16px]",
        tone === "critical" ? "text-red" : "text-fg-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Row actions stay hidden until the row is hovered or something inside them
 * takes focus, which keeps the list quiet — the same trick the library uses for
 * its per-row controls. They remain reachable by keyboard.
 */
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-[6px] opacity-0 transition-opacity duration-100 focus-within:opacity-100 group-hover:opacity-100">
      {children}
    </div>
  );
}

/** The filter/search strip that sits under a page header. */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-b border-line">
      <Container className="flex flex-wrap items-center gap-[8px] py-[10px]">
        {children}
      </Container>
    </div>
  );
}

/**
 * Offset pagination for the lists that use it — which is every list except the
 * event transcript, and that one is cursored on `seq` for reasons that do not
 * apply here.
 *
 * Rendered as links rather than buttons so a page is a real URL: it survives a
 * reload, it can be sent to someone, and it needs no JavaScript.
 */
export function Pagination({
  total,
  limit,
  offset,
  /** The current query, minus `offset` — every filter has to survive paging. */
  params,
  basePath,
}: {
  total: number;
  limit: number;
  offset: number;
  params: Record<string, string | undefined>;
  basePath: string;
}) {
  if (total <= limit) return null;

  const href = (nextOffset: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (nextOffset > 0) query.set("offset", String(nextOffset));
    const qs = query.toString();
    return qs === "" ? basePath : `${basePath}?${qs}`;
  };

  const first = offset + 1;
  const last = Math.min(offset + limit, total);
  const hasPrevious = offset > 0;
  const hasNext = last < total;

  return (
    <div className="flex items-center justify-between gap-[12px] px-[2px]">
      <span className="text-mini leading-[16px] text-fg-subtle tabular-nums">
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-[6px]">
        {hasPrevious ? (
          <Link
            href={href(Math.max(0, offset - limit))}
            className={paginationLink}
            rel="prev"
          >
            Previous
          </Link>
        ) : (
          <span className={paginationDisabled}>Previous</span>
        )}
        {hasNext ? (
          <Link href={href(offset + limit)} className={paginationLink} rel="next">
            Next
          </Link>
        ) : (
          <span className={paginationDisabled}>Next</span>
        )}
      </div>
    </div>
  );
}

const paginationLink =
  "inline-flex items-center rounded-control border border-line-strong bg-control px-[10px] py-[4px] " +
  "text-mini leading-[16px] text-fg-muted no-underline shadow-control transition-colors duration-100 " +
  "hover:bg-control-hover hover:text-fg";

const paginationDisabled =
  "inline-flex cursor-not-allowed items-center rounded-control border border-line px-[10px] py-[4px] " +
  "text-mini leading-[16px] text-fg-faint";
