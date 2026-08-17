<div align="center">
  <img src=".github/cerebral-lockup.svg" alt="Cerebral" height="44">

  **Every line of agent code, explained.**

  `git blame` tells you an agent wrote it. Cerebral tells you *why* — the task,
  the prompt, the reasoning, the decisions.
</div>

---

This is **`cerebral_front`**, the Cerebral web app: the dashboard where you read
what your agents did and answer the things they are blocked on.

## What Cerebral is

An agent writes a hundred lines and moves on. Six weeks later the blame gutter
says `agent · 4 days ago` on every row, and that is all you get — not what was
asked for, not what it tried first, not why it landed here.

Cerebral records each step of an agent run as a real git snapshot in your own
repo, then hangs the provenance off it:

- **Blame that answers "why."** Click a line, see the task, the reasoning and
  the decision behind it.
- **Replayable history.** Every prompt, tool call and diff — step by step, not
  just the end result.
- **Real git underneath.** Snapshots are ordinary commits. Nothing proprietary;
  delete Cerebral and you keep your history.

It hooks into the agent you already use (Claude Code, Cursor) — hooks only, no
workflow change.

## The rest of Cerebral

| Repo | What it is |
| --- | --- |
| [**cerebral**](https://github.com/aslon1213/cerebral) | Core platform — the API this app is a client of, and the run/provenance data model underneath it |
| [**cerebral-cli**](https://github.com/aslon123/cerebral-cli) | Command line — drive runs, install agent hooks, and query provenance from the terminal |
| [**cerebral-vs_code-extension**](https://github.com/aslon1213/cerebral-vs_code-extension) | VS Code — the blame gutter and run history inside the editor |
| [**cerebral-zed-extension**](https://github.com/aslon1213/cerebral-zed-extension) | Zed — the same, for Zed |
| **cerebral_front** *(this repo)* | Web app — inbox, runs, transcripts, and the project/task/agent surface |

## Getting started

Requires Node 20+ (or Bun) and a running Cerebral backend.

```bash
bun install          # or: npm install
cp .env.example .env.local
bun dev              # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Signing in needs a backend at `API_BASE_URL`. To get screens worth looking at,
seed some runs:

```bash
npm run seed:dev
```

That creates (or signs in as) a user `demo` / `demo-password-123` and writes
realistic projects, tasks, agents, repos and runs. It plays both credentials the
server distinguishes — a session token for the person-side objects, an API key
for everything on the ingest path. **It is destructive:** it purges every
execution belonging to that user first, so point it at a development database
and nothing else.

### Scripts

| Command | |
| --- | --- |
| `bun dev` | Development server |
| `bun run build` | Production build |
| `bun start` | Serve the build |
| `bun run lint` | ESLint |
| `npm run seed:dev` | Seed a dev database with runs (destructive) |

### Configuration

| Variable | |
| --- | --- |
| `API_BASE_URL` | Origin of the Cerebral backend. Defaults to `http://localhost:8000` |
| `DEMO_VIDEO_URL` | Source for the `/demo` recording. Read per request, so replacing it takes a restart, not a rebuild |

`.gitignore` ignores all `.env*`, so committing `.env.example` needs
`git add -f`.

## The app

Three groups in the order the work happens — what is waiting on you, what the
agents did, and the things their runs are made of:

| Route | |
| --- | --- |
| `/inbox` | Interventions: agents stopped mid-run, waiting on a person. Pending only, oldest first |
| `/runs`, `/runs/[id]` | Executions — status, usage, the event transcript, the code changes, live tailing |
| `/projects`, `/tasks`, `/labels` | Plan: human and agent work in one place |
| `/repos`, `/agents`, `/api-keys` | Setup: what agents run against, and the credentials they run with |
| `/`, `/demo` | Public marketing pages, reachable signed in or out |

Writes on the ingest path — opening a run, appending transcript events, raising
an intervention — are deliberately **not** in this client. They are API-key-only
at the server so that every line of a transcript is attributable to a credential
issued for an agent. See [`lib/api/README.md`](lib/api/README.md).

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.

Worth knowing before you edit:

- **Server by default.** `"use client"` only where state, effects or event
  handlers genuinely need it.
- **Mutations are Server Actions** in `app/actions/`, one module per resource,
  with `useActionState` for field errors.
- **`proxy.ts`, not `middleware.ts`** — renamed in Next 16. It refreshes the
  access token just before expiry (the only context that can reliably write
  cookies) and keeps guests out of app routes.
- **Tokens live in httpOnly cookies**, never `localStorage`. Every API call goes
  through the Next.js server.
- **No component library.** Every colour, size and radius refers to a design
  token in `app/globals.css` by role. Dark only.

### Layout

```
app/
  page.tsx           the landing page
  demo/              the demo recording
  login/ register/   auth
  (app)/             the signed-in app — one directory per route above
  actions/           Server Actions, one module per resource
  _components/       UI primitives, badges, transcript, forms
lib/
  api/               typed backend client, session, refresh
  vocabulary.ts      display strings for the API's enums
proxy.ts             token refresh + route guarding
scripts/             dev data seeding
```

### Further reading

- [`lib/api/README.md`](lib/api/README.md) — the API client: the response
  envelope, the two paginations (and why using the wrong one is a real bug),
  error handling, auth and refresh.
- [`app/_components/README.md`](app/_components/README.md) — UI conventions:
  what belongs on the client, why disclosures are `<details>`, why colour is
  never the only signal.
- [`AGENTS.md`](AGENTS.md) — read this first if you are an agent working in here.
  This is not the Next.js in your training data; check
  `node_modules/next/dist/docs/` before writing code.

---

<div align="center">
  <sub>Developer preview.</sub>
</div>
