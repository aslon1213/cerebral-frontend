/**
 * The files the landing page blames, and the provenance behind them.
 *
 * Four languages, one codebase: the TypeScript that talks to the API, the
 * Python that builds the index, the Rust that writes the snapshots, and the Go
 * hook that watches the agent. Cerebral reads git, and git does not care what
 * the file is written in — the page should not look like it does either.
 *
 * The hero and the problem section draw from the same set: the hero with
 * Cerebral's blame beside the code, the problem section with git's. The shape
 * of each history is the shape a real one has — a scaffolding commit, a fix,
 * sometimes a hand edit. Blame maps lines to commits rather than lines to
 * authors, which is why several lines share a record and why a run of them
 * collapses to one label in the gutter.
 *
 * Every file is eleven lines long. That is not a coincidence: the panel keeps
 * its height when you switch tabs, so nothing below it jumps.
 */

export type Language = "TypeScript" | "Python" | "Rust" | "Go";

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface Snapshot {
  /** Short hash of the git commit Cerebral wrote when the step finished. */
  id: string;
  author: "agent" | "you";
  /** Who or what did the writing — the agent's name, or the person's. */
  by: string;
  when: string;
  /** The commit subject, as `git log --oneline` would print it. */
  subject: string;
  /** The four things blame cannot tell you. Absent on hand-written lines. */
  task?: string;
  prompt?: string;
  reasoning?: string;
  decision?: string;
  /** Stands in for the four above when there is no agent run to point at. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface CodeLine {
  /** Line number in the real file. */
  n: number;
  /** Which snapshot last touched it. */
  snapshot: string;
  text: string;
}

export interface BlamedFile {
  /** The tab's label. The extension is how the language announces itself. */
  name: string;
  path: string;
  lang: Language;
  /** The line the file opens on — the one with a story worth reading first. */
  defaultLine: number;
  snapshots: Record<string, Snapshot>;
  code: CodeLine[];
}

export const FILES: BlamedFile[] = [
  {
    name: "refresh.ts",
    path: "lib/api/refresh.ts",
    lang: "TypeScript",
    defaultLine: 22,
    snapshots: {
      a3f2c19: {
        id: "a3f2c19",
        author: "agent",
        by: "Claude Code",
        when: "2 days ago",
        subject: "Add a refresh helper the proxy can call",
        task: "Token refresh is written twice — once in the edge proxy, once in the sign-in action. Pull it into one place.",
        prompt:
          "“Both copies drifted. The proxy retries once, the action doesn’t. Make it one function.”",
        reasoning:
          "Both callers need the same exchange, but only the caller knows where the new pair goes: the proxy writes response cookies, the action writes the cookie store.",
        decision:
          "Export a function that does the exchange and nothing else. Persistence stays with the caller.",
      },
      "7d41e8b": {
        id: "7d41e8b",
        author: "agent",
        by: "Claude Code",
        when: "2 days ago",
        subject: "Take the base URL as an argument",
        task: "Refresh throws inside the edge proxy before it ever reaches the API.",
        prompt: "“Works in the action, 500s in the proxy. Same token.”",
        reasoning:
          "The helper was reading the base URL out of request headers. The proxy runs without that context, so the read failed a line before the call.",
        decision:
          "Accept the base URL as an optional argument. Callers holding a request pass it; everyone else falls through to the env var.",
      },
      c8b0a52: {
        id: "c8b0a52",
        author: "you",
        by: "Aslon",
        when: "yesterday",
        subject: "Reuse the shared client factory",
        note: "Written by hand. Cerebral records what it saw the agent do and nothing more — there is no run behind this line to open.",
      },
      "4b6d2af": {
        id: "4b6d2af",
        author: "agent",
        by: "Claude Code",
        when: "2 days ago",
        subject: "Return null instead of throwing",
        task: "A rejected refresh should mean “sign in again”, not a 500 on every page.",
        prompt:
          "“The API went down for four minutes and the whole app went with it.”",
        reasoning:
          "First attempt threw a typed AuthError. Every one of the four call sites caught it and did the same thing — redirect to sign-in — so the type bought nothing and one missed catch was still a 500.",
        decision:
          "Swallow the failure and return null. One branch at each call site, and an unreachable API reads the same as a bad token.",
      },
    },
    code: [
      { n: 14, snapshot: "a3f2c19", text: "export async function performRefresh(" },
      { n: 15, snapshot: "a3f2c19", text: "  refreshToken: string," },
      { n: 16, snapshot: "7d41e8b", text: "  baseUrl?: string," },
      { n: 17, snapshot: "a3f2c19", text: "): Promise<TokenResponse | null> {" },
      { n: 18, snapshot: "4b6d2af", text: "  try {" },
      { n: 19, snapshot: "c8b0a52", text: "    const client = createApiClient({ baseUrl });" },
      {
        n: 20,
        snapshot: "a3f2c19",
        text: "    return await client.auth.refresh({ refresh_token: refreshToken });",
      },
      { n: 21, snapshot: "4b6d2af", text: "  } catch {" },
      { n: 22, snapshot: "4b6d2af", text: "    return null;" },
      { n: 23, snapshot: "4b6d2af", text: "  }" },
      { n: 24, snapshot: "a3f2c19", text: "}" },
    ],
  },

  {
    name: "embed.py",
    path: "services/ingest/embed.py",
    lang: "Python",
    defaultLine: 37,
    snapshots: {
      "9c14be7": {
        id: "9c14be7",
        author: "agent",
        by: "Claude Code",
        when: "4 days ago",
        subject: "Cap the embedding batch at 96",
        task: "Reindexing a large repo dies partway through with a gateway timeout.",
        prompt: "“It gets about 60% through cerebral/ and then 504s.”",
        reasoning:
          "Batches of 512 took over a minute on files with long docstrings, past the gateway's ceiling. Tried 256 next — still over on the worst chunk. 96 keeps the slowest batch under eight seconds with room to spare.",
        decision:
          "Fix the batch at 96 and give it a name, so the next person tuning it changes one line rather than hunting a literal.",
      },
      "2ef80a3": {
        id: "2ef80a3",
        author: "agent",
        by: "Claude Code",
        when: "5 days ago",
        subject: "Add embed_batch",
        task: "Every caller was assembling its own request to the embeddings API.",
        prompt: "“Three call sites, three different retry policies. Unify it.”",
        reasoning:
          "The differences between the copies were accidental, not deliberate — nobody had chosen the retry policies, they had just been written at different times.",
        decision:
          "One entry point that takes the texts and the model. Callers stop deciding how the request is made.",
      },
      b7d3915: {
        id: "b7d3915",
        author: "agent",
        by: "Claude Code",
        when: "4 days ago",
        subject: "Extend as batches land instead of collecting futures",
        task: "Memory climbs to several gigabytes on a full reindex.",
        prompt: "“The ingest worker gets OOM-killed on anything over ~40k chunks.”",
        reasoning:
          "The first version gathered every batch's coroutine and awaited them together, so all the vectors for the whole repo were live at once. Nothing needed them all at once.",
        decision:
          "Extend the output as each batch returns. Peak memory is now one batch, not one repo.",
      },
    },
    code: [
      { n: 37, snapshot: "9c14be7", text: "BATCH = 96" },
      { n: 38, snapshot: "2ef80a3", text: "" },
      { n: 39, snapshot: "2ef80a3", text: "" },
      { n: 40, snapshot: "2ef80a3", text: "def embed_batch(" },
      { n: 41, snapshot: "2ef80a3", text: "    texts: list[str]," },
      { n: 42, snapshot: "2ef80a3", text: "    model: str = EMBED_MODEL," },
      { n: 43, snapshot: "2ef80a3", text: ") -> list[list[float]]:" },
      { n: 44, snapshot: "2ef80a3", text: "    out: list[list[float]] = []" },
      { n: 45, snapshot: "b7d3915", text: "    for i in range(0, len(texts), BATCH):" },
      {
        n: 46,
        snapshot: "b7d3915",
        text: "        out.extend(embed(texts[i : i + BATCH], model))",
      },
      { n: 47, snapshot: "2ef80a3", text: "    return out" },
    ],
  },

  {
    name: "snapshot.rs",
    path: "crates/store/src/snapshot.rs",
    lang: "Rust",
    defaultLine: 70,
    snapshots: {
      f0a92c4: {
        id: "f0a92c4",
        author: "agent",
        by: "Claude Code",
        when: "6 days ago",
        subject: "Write snapshots through git2 instead of shelling out",
        task: "Snapshot writes fail on repos with a path containing a space.",
        prompt: "“Broke for a user with the repo under ~/Code Projects/.”",
        reasoning:
          "The recorder was building a `git commit-tree` command line and handing it to a shell. Quoting was one bug among several: the shell also cost a process per step, and errors came back as scraped stderr.",
        decision:
          "Bind git2 and build the commit in-process. No shell, no quoting, and failures arrive as typed errors.",
      },
      "5b1e77d": {
        id: "5b1e77d",
        author: "agent",
        by: "Claude Code",
        when: "3 days ago",
        subject: "Look up the tree once",
        task: "Snapshot writes are slower than the agent step they record.",
        prompt: "“Profile says we're spending most of a snapshot inside find_tree.”",
        reasoning:
          "`find_tree` was called in the commit arguments and again by the caller a few lines up. Two lookups per snapshot, and on a large tree each one is not cheap.",
        decision: "Resolve the tree once, up front, and pass the handle down.",
      },
      a71c530: {
        id: "a71c530",
        author: "agent",
        by: "Claude Code",
        when: "3 days ago",
        subject: "Parent the snapshot on HEAD, not the branch tip",
        task: "Snapshots taken during a rebase attach to the wrong history.",
        prompt: "“Ran a long agent task mid-rebase and the snapshots ended up orphaned.”",
        reasoning:
          "Reading the tip of the current branch is only the same as HEAD when HEAD is attached. During a rebase, a bisect, or a detached checkout it is not, and the snapshot lands on a branch the user is not on.",
        decision:
          "Commit against HEAD itself and let git resolve it. The snapshot lands where the work did.",
      },
    },
    code: [
      {
        n: 64,
        snapshot: "f0a92c4",
        text: "pub fn commit(&self, tree: Oid, msg: &str) -> Result<Oid> {",
      },
      { n: 65, snapshot: "f0a92c4", text: "    let parent = self.head()?;" },
      { n: 66, snapshot: "f0a92c4", text: "    let sig = self.signature()?;" },
      { n: 67, snapshot: "5b1e77d", text: "    let tree = self.repo.find_tree(tree)?;" },
      { n: 68, snapshot: "f0a92c4", text: "" },
      { n: 69, snapshot: "a71c530", text: "    let oid = self.repo.commit(" },
      {
        n: 70,
        snapshot: "a71c530",
        text: "        Some(HEAD), &sig, &sig, msg, &tree, &[&parent],",
      },
      { n: 71, snapshot: "a71c530", text: "    )?;" },
      { n: 72, snapshot: "f0a92c4", text: "" },
      { n: 73, snapshot: "f0a92c4", text: "    Ok(oid)" },
      { n: 74, snapshot: "f0a92c4", text: "}" },
    ],
  },

  {
    name: "watch.go",
    path: "internal/hook/watch.go",
    lang: "Go",
    defaultLine: 58,
    snapshots: {
      "3ad5e19": {
        id: "3ad5e19",
        author: "agent",
        by: "Claude Code",
        when: "8 days ago",
        subject: "Never block the agent on the recorder",
        task: "The hook adds noticeable latency to every tool call.",
        prompt: "“Claude Code feels sluggish with Cerebral on. ~40ms per call.”",
        reasoning:
          "The send was blocking, so a slow snapshot write became the agent's problem. A buffered channel came first and only moved the cliff — a long run filled 1024 slots and the stalls came back.",
        decision:
          "Non-blocking send with a default arm. Recording is best-effort; a dropped step is better than a stalled agent.",
      },
      c6f2b84: {
        id: "c6f2b84",
        author: "you",
        by: "Aslon",
        when: "6 days ago",
        subject: "Honour the context deadline",
        note: "Written by hand. Cerebral records what it saw the agent do and nothing more — there is no run behind this line to open.",
      },
      "8e0b47a": {
        id: "8e0b47a",
        author: "agent",
        by: "Claude Code",
        when: "6 days ago",
        subject: "Count what we drop",
        task: "A best-effort recorder can lose steps and nobody would know.",
        prompt: "“If we're dropping, I want to find out from a graph, not from a gap.”",
        reasoning:
          "The default arm made the queue silently lossy. A log line per drop would be worse than useless during the bursts where drops actually happen.",
        decision:
          "One atomic counter, exported on /metrics. A recorder that starts losing steps shows up as a rising line.",
      },
    },
    code: [
      {
        n: 52,
        snapshot: "3ad5e19",
        text: "func (w *Watcher) Record(ctx context.Context, s Step) error {",
      },
      { n: 53, snapshot: "3ad5e19", text: "    select {" },
      { n: 54, snapshot: "3ad5e19", text: "    case w.queue <- s:" },
      { n: 55, snapshot: "3ad5e19", text: "        return nil" },
      { n: 56, snapshot: "c6f2b84", text: "    case <-ctx.Done():" },
      { n: 57, snapshot: "c6f2b84", text: "        return ctx.Err()" },
      { n: 58, snapshot: "3ad5e19", text: "    default:" },
      { n: 59, snapshot: "3ad5e19", text: "    }" },
      { n: 60, snapshot: "8e0b47a", text: "    w.dropped.Add(1)" },
      { n: 61, snapshot: "8e0b47a", text: "    return nil" },
      { n: 62, snapshot: "3ad5e19", text: "}" },
    ],
  },
];

/** The file the hero opens on. */
export const HERO_FILE = FILES[0];

/**
 * The file the problem section blames.
 *
 * Deliberately not the one the hero opens on. Someone who never touches the
 * tabs still sees two languages, and the point being made there — that blame
 * says the same nothing whatever the file — is easier to believe when the two
 * panels are not the same eleven lines.
 */
export const PROBLEM_FILE = FILES[1];

// ---------------------------------------------------------------------------
// Syntax
// ---------------------------------------------------------------------------

/**
 * Four classes, drawn from the library's decoration palette. Enough to read as
 * code; not enough to make the panel the loudest thing on the page.
 */
export type TokenKind = "kw" | "typ" | "fn" | "str" | "pun";

export interface Token {
  t: string;
  k?: TokenKind;
}

export const TOKEN_CLASSES: Record<TokenKind, string> = {
  kw: "text-purple",
  typ: "text-teal",
  fn: "text-blue",
  str: "text-green",
  pun: "text-fg-faint",
};

/*
  These snippets are highlighted rather than transcribed token by token.

  Hand-writing the spans would be several hundred lines of data for forty-four
  lines of code, and adding a fifth language would mean writing them all again.
  A tokeniser this small is only viable because the input is fixed — it knows
  nothing about comments, template literals, or anything else these particular
  snippets do not contain.
*/

const KEYWORDS: Record<Language, string[]> = {
  TypeScript: [
    "export", "async", "function", "return", "await", "const", "let",
    "try", "catch", "null", "undefined", "new", "if", "else",
  ],
  Python: [
    "def", "return", "for", "in", "if", "else", "import", "from",
    "None", "True", "False", "with", "as", "yield",
  ],
  Rust: [
    "pub", "fn", "let", "mut", "self", "match", "if", "else",
    "return", "impl", "use", "struct", "enum", "for", "in",
  ],
  Go: [
    "func", "return", "select", "case", "default", "if", "else",
    "for", "range", "nil", "var", "type", "struct", "go", "defer",
  ],
};

const TYPES: Record<Language, string[]> = {
  TypeScript: ["string", "number", "boolean", "void", "unknown", "never"],
  Python: ["str", "int", "float", "bool", "list", "dict", "tuple", "bytes"],
  Rust: ["str", "u8", "u32", "u64", "usize", "i32", "i64", "bool", "String"],
  Go: ["string", "int", "int64", "float64", "bool", "byte", "error", "any"],
};

/**
 * Identifiers, strings, and everything in between.
 *
 * Two things this has to get right. The alternation order: strings come before
 * identifiers so a keyword inside quotes stays a string. And exhaustiveness:
 * a character no branch matches is not flagged, it is silently dropped from
 * the rendered line, so the last branch deliberately takes everything the
 * others do not — digits, punctuation, and an unpaired quote alike.
 */
const TOKEN_RE =
  /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*)|(\d+)|(\s+)|([^\sA-Za-z_\d]+)/g;

/** Screaming case is a constant, and reads better left alone than dressed as a type. */
const SCREAMING = /^[A-Z][A-Z0-9_]*$/;

function classify(word: string, lang: Language, followedByCall: boolean) {
  if (KEYWORDS[lang].includes(word)) return "kw" as const;
  if (TYPES[lang].includes(word)) return "typ" as const;
  if (followedByCall) return "fn" as const;
  if (SCREAMING.test(word)) return undefined;
  if (/^[A-Z]/.test(word)) return "typ" as const;
  return undefined;
}

export function tokenize(text: string, lang: Language): Token[] {
  const tokens: Token[] = [];
  TOKEN_RE.lastIndex = 0;

  for (let m = TOKEN_RE.exec(text); m !== null; m = TOKEN_RE.exec(text)) {
    const [raw, quoted, word, , , punctuation] = m;

    if (quoted) tokens.push({ t: raw, k: "str" });
    else if (word) {
      tokens.push({ t: raw, k: classify(word, lang, text[m.index + raw.length] === "(") });
    } else if (punctuation) tokens.push({ t: raw, k: "pun" });
    // Numbers and whitespace, which take the colour of the code around them.
    else tokens.push({ t: raw });
  }

  return tokens;
}

/** True when this line starts a new run — the only rows blame labels. */
export function startsRun(code: CodeLine[], index: number): boolean {
  return index === 0 || code[index - 1].snapshot !== code[index].snapshot;
}

/**
 * Which lines a record accounts for, collapsed into ranges — "18, 21–23"
 * rather than a list, so a record covering half the file stays one line long.
 */
export function coverage(code: CodeLine[], snapshotId: string): string {
  const numbers = code.filter((l) => l.snapshot === snapshotId).map((l) => l.n);
  const runs: Array<[number, number]> = [];

  for (const n of numbers) {
    const last = runs.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }

  const parts = runs.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`));
  return `${numbers.length === 1 ? "Line" : "Lines"} ${parts.join(", ")}`;
}
