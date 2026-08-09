import { cx } from "./ui";

/**
 * Renders an agent-supplied JSON blob readably without assuming a schema.
 *
 * An intervention's `request`, an event's `payload.data` and a run's `result`
 * are all free-form: the agent decides the shape and it may change between
 * versions. So nothing here keys off a particular field. What it does instead
 * is respect the shapes JSON actually has — a string is prose, a list of
 * strings is a list, an object is a set of labelled rows — and fall back to
 * formatted JSON for anything deeper than that.
 *
 * Dumping `JSON.stringify` on screen would have been less code and would have
 * made every one of these unreadable at a glance, which is the opposite of what
 * the inbox needs.
 */

/** `estimated_lock` → `Estimated lock`. Snake case is the API's, not a reader's. */
function humanise(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Long enough that it wants its own line rather than a value column. */
function isProse(value: unknown): value is string {
  return typeof value === "string" && (value.length > 72 || value.includes("\n"));
}

function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-fg-faint">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green" : "text-fg-subtle"}>{value ? "yes" : "no"}</span>
    );
  }
  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }
  return <span>{String(value)}</span>;
}

function Value({ value, depth }: { value: unknown; depth: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-fg-faint">none</span>;

    // A list of scalars reads as a list; a list of objects is structure and
    // gets the same treatment an object would.
    if (value.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      return (
        <ul className="flex list-none flex-col gap-[2px]">
          {value.map((item, index) => (
            <li key={index} className="flex gap-[7px]">
              <span aria-hidden="true" className="text-fg-faint">
                •
              </span>
              <span className="min-w-0">
                <Scalar value={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="flex flex-col gap-[8px]">
        {value.map((item, index) => (
          <Value key={index} value={item} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) return <JsonView data={value} depth={depth + 1} />;

  if (isProse(value)) {
    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }

  return <Scalar value={value} />;
}

/**
 * Order the fields by shape, because the order they arrive in is an artefact.
 *
 * These blobs are stored as Postgres `jsonb`, which does not preserve key
 * order — it re-sorts by key length, then alphabetically. So an approval whose
 * agent wrote `summary` first comes back with `risk` first, purely because
 * "risk" is shorter. There is no author intent left in the incoming order to
 * respect, which frees us to impose one that reads.
 *
 * Explanation first (the prose is why the agent stopped), then the short facts
 * as a compact list, then nested structure. Within a group the incoming order
 * is kept — it is arbitrary either way, and stable beats shuffled.
 */
function orderedEntries(data: Record<string, unknown>): [string, unknown][] {
  const rank = (value: unknown): number => {
    if (isProse(value)) return 0;
    if (Array.isArray(value) || isPlainObject(value)) return 2;
    return 1;
  };

  return Object.entries(data)
    .map((entry, index) => ({ entry, index, rank: rank(entry[1]) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.entry);
}

export function JsonView({
  data,
  depth = 0,
  className,
}: {
  data: Record<string, unknown>;
  depth?: number;
  className?: string;
}) {
  const entries = orderedEntries(data);
  if (entries.length === 0) {
    return <p className={cx("text-small text-fg-faint", className)}>Nothing recorded.</p>;
  }

  // Past a couple of levels the labelled-row layout stops helping and starts
  // costing indentation, so deep structure falls back to formatted JSON.
  if (depth > 2) {
    return (
      <pre className="overflow-x-auto rounded-input border border-line bg-surface-sunken px-[10px] py-[8px] font-mono text-mini leading-[18px] text-fg-muted">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <dl
      className={cx(
        "flex flex-col gap-[6px] text-small",
        depth > 0 && "border-l border-line pl-[12px]",
        className,
      )}
    >
      {entries.map(([key, value]) => {
        // Prose and structure need the full width, so their label sits above
        // them; short scalars read better as a label/value pair on one line.
        const stacked = isProse(value) || isPlainObject(value) || Array.isArray(value);

        return (
          <div
            key={key}
            className={cx(
              stacked ? "flex flex-col gap-[3px]" : "flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]",
            )}
          >
            <dt
              className={cx(
                "text-mini leading-[16px] text-fg-subtle",
                !stacked && "shrink-0",
              )}
            >
              {humanise(key)}
            </dt>
            <dd className="min-w-0 text-fg-muted">
              <Value value={value} depth={depth} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
