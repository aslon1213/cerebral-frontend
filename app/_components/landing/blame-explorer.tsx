"use client";

import { useRef, useState } from "react";

import {
  FILES,
  TOKEN_CLASSES,
  coverage,
  startsRun,
  tokenize,
  type BlamedFile,
  type Snapshot,
} from "./blame";

/**
 * The hero's thesis, working rather than described: a blame gutter you can
 * click, with the run behind each line beside it.
 *
 * Four files across four languages sit behind the tabs, because Cerebral reads
 * git and git does not care what the file is written in.
 *
 * Both strips are real tablists — a file and its code, a line and its record —
 * so the arrow keys walk the panel the way they would walk an editor, and a
 * screen reader announces what is open rather than leaving the user to guess.
 */
export function BlameExplorer() {
  /*
    One piece of state, not two. A file and a line only make sense together —
    holding them apart is holding a line number that may not exist in the file
    on screen, and every transition here has to set both anyway.
  */
  const [open, setOpen] = useState({ file: 0, line: FILES[0].defaultLine });

  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const rows = useRef<Array<HTMLButtonElement | null>>([]);

  const file = FILES[open.file];
  const index = file.code.findIndex((l) => l.n === open.line);
  const snapshot = file.snapshots[file.code[index].snapshot];

  function openFile(next: number) {
    const clamped = clamp(next, FILES.length);
    setOpen({ file: clamped, line: FILES[clamped].defaultLine });
    tabs.current[clamped]?.focus();
  }

  /** Move the selection and take the focus with it, as a tablist should. */
  function openLine(next: number) {
    const clamped = clamp(next, file.code.length);
    setOpen({ file: open.file, line: file.code[clamped].n });
    rows.current[clamped]?.focus();
  }

  return (
    /* The code column takes the larger share: the record beside it is four
       short paragraphs, while the code has a line of 68 characters in it and
       is the thing being read. */
    <div className="grid gap-[16px] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-popover">
        {/* The open-files strip an editor puts above the buffer. Same idea:
            the active tab wears the fill of the pane below it. */}
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label="Files"
          onKeyDown={(event) => {
            const next = roving(event.key, open.file, FILES.length, "horizontal");
            if (next === null) return;
            event.preventDefault();
            openFile(next);
          }}
          className="flex overflow-x-auto bg-surface-sunken"
        >
          {FILES.map((candidate, i) => {
            const active = i === open.file;
            return (
              <button
                key={candidate.name}
                ref={(node) => {
                  tabs.current[i] = node;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="blame-code"
                tabIndex={active ? 0 : -1}
                onClick={() => openFile(i)}
                className={`shrink-0 cursor-pointer border-r border-b border-line px-[13px] py-[8px] font-mono text-mini transition-colors duration-100 ${
                  active
                    ? "border-b-transparent bg-surface text-fg"
                    : "text-fg-subtle hover:bg-overlay-hover hover:text-fg"
                }`}
              >
                {candidate.name}
              </button>
            );
          })}
          {/* Runs the hairline out to the panel edge past the last tab. */}
          <span aria-hidden="true" className="min-w-[16px] grow border-b border-line" />
        </div>

        <div className="flex items-center justify-between gap-[12px] border-b border-line px-[14px] py-[9px]">
          <span className="truncate font-mono text-mini text-fg-subtle">
            {file.path}
            <span className="text-fg-faint"> · {file.lang}</span>
          </span>
          {/* The one instruction the panel needs; it is also the product's pitch. */}
          <span className="shrink-0 font-mono text-micro tracking-[0.04em] text-fg-faint uppercase">
            Click a line
          </span>
        </div>

        {/* Long lines scroll sideways rather than wrapping — a wrapped line of
            code is a line that no longer matches its number in the gutter. */}
        <div id="blame-code" role="tabpanel" className="overflow-x-auto">
          <div
            key={file.name}
            role="tablist"
            aria-orientation="vertical"
            aria-label={`Blame for ${file.path}`}
            onKeyDown={(event) => {
              const next = roving(event.key, index, file.code.length, "vertical");
              if (next === null) return;
              event.preventDefault();
              openLine(next);
            }}
            className="landing-swap min-w-max py-[6px]"
          >
            {file.code.map((row, i) => {
              const record = file.snapshots[row.snapshot];
              const selected = i === index;
              const sameRun = record.id === snapshot.id;

              return (
                <button
                  key={row.n}
                  ref={(node) => {
                    rows.current[i] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`blame-line-${row.n}`}
                  aria-selected={selected}
                  aria-controls="blame-record"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setOpen({ file: open.file, line: row.n })}
                  className={`flex w-full cursor-pointer items-stretch text-left transition-colors duration-100 ${
                    selected
                      ? "bg-brand-wash"
                      : sameRun
                        ? "bg-brand-wash/40 hover:bg-brand-wash/70"
                        : "hover:bg-overlay-hover"
                  }`}
                >
                  {/* Authorship reads as a colour before it reads as a word:
                      the library's primary for the agent, its grey for a
                      person. */}
                  <span
                    aria-hidden="true"
                    className={`w-[2px] shrink-0 ${
                      record.author === "agent" ? "bg-brand-ring" : "bg-slate"
                    } ${selected ? "" : "opacity-45"}`}
                  />

                  {/* Blame labels a run once, where it starts — the same thing
                      `git blame` does, and the reason a record can cover more
                      than the line under the cursor.

                      The hash goes on a phone. It costs half the gutter, the
                      code is already scrolling to fit, and the open record
                      spells it out anyway. */}
                  <span className="flex w-[58px] shrink-0 items-baseline gap-[6px] px-[9px] py-[2px] font-mono text-micro sm:w-[108px]">
                    {startsRun(file.code, i) ? (
                      <>
                        <span className="hidden text-fg-faint sm:inline">
                          {record.id}
                        </span>
                        <span
                          className={
                            record.author === "agent"
                              ? "text-fg-subtle"
                              : "text-slate"
                          }
                        >
                          {record.author}
                        </span>
                      </>
                    ) : null}
                  </span>

                  <span className="w-[26px] shrink-0 py-[2px] pr-[12px] text-right font-mono text-micro text-fg-faint tabular-nums">
                    {row.n}
                  </span>

                  <code className="py-[2px] pr-[16px] font-mono text-[12px] leading-[19px] whitespace-pre text-fg-muted">
                    {tokenize(row.text, file.lang).map((token, t) => (
                      <span key={t} className={token.k && TOKEN_CLASSES[token.k]}>
                        {token.t}
                      </span>
                    ))}
                    {/* A blank line still has to occupy one. */}
                    {row.text === "" ? " " : null}
                  </code>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Record file={file} snapshot={snapshot} line={open.line} />
    </div>
  );
}

/**
 * The four things blame cannot tell you, for whichever run wrote the selected
 * line — or an honest blank where a person wrote it by hand.
 *
 * Remounted on every change (`key`) so the swap animation replays.
 */
function Record({
  file,
  snapshot,
  line,
}: {
  file: BlamedFile;
  snapshot: Snapshot;
  line: number;
}) {
  const agent = snapshot.author === "agent";

  return (
    <div
      key={`${file.name}:${snapshot.id}`}
      id="blame-record"
      role="tabpanel"
      aria-labelledby={`blame-line-${line}`}
      tabIndex={-1}
      className="landing-swap rounded-panel border border-line bg-surface p-[16px] shadow-panel"
    >
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] font-mono text-micro">
        <span
          aria-hidden="true"
          className={`size-[6px] rounded-full ${agent ? "bg-brand-ring" : "bg-slate"}`}
        />
        <span className="text-fg-subtle">{snapshot.id}</span>
        <span className="text-fg-faint">·</span>
        <span className="text-fg-subtle">{snapshot.by}</span>
        <span className="text-fg-faint">·</span>
        <span className="text-fg-faint">{snapshot.when}</span>
      </div>

      <p className="mt-[8px] text-normal font-medium text-fg">{snapshot.subject}</p>

      <dl className="mt-[14px] flex flex-col gap-[10px] border-t border-line pt-[14px]">
        {snapshot.note ? (
          <p className="text-small text-fg-subtle">{snapshot.note}</p>
        ) : (
          <>
            <Entry term="Task">{snapshot.task}</Entry>
            <Entry term="Prompt">{snapshot.prompt}</Entry>
            <Entry term="Reasoning">{snapshot.reasoning}</Entry>
            <Entry term="Decision">{snapshot.decision}</Entry>
          </>
        )}
      </dl>

      <p className="mt-[14px] border-t border-line pt-[10px] font-mono text-micro text-fg-faint">
        {coverage(file.code, snapshot.id)} · {file.name} · snapshot on main
      </p>
    </div>
  );
}

/** One labelled paragraph of the record. */
function Entry({ term, children }: { term: string; children?: string }) {
  return (
    <div className="flex flex-col gap-[3px] sm:flex-row sm:gap-[12px]">
      <dt className="shrink-0 pt-[2px] font-mono text-micro tracking-[0.04em] text-fg-faint uppercase sm:w-[76px]">
        {term}
      </dt>
      <dd className="text-small text-fg-muted">{children}</dd>
    </div>
  );
}

function clamp(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}

/**
 * Where a roving tablist should move next, or `null` when the key is not one
 * it handles and the browser should keep it.
 */
function roving(
  key: string,
  current: number,
  count: number,
  orientation: "horizontal" | "vertical",
): number | null {
  const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

  if (key === forward) return current + 1;
  if (key === back) return current - 1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
