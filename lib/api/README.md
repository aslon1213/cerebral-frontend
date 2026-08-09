# Cerebral API client

Typed client for the FastAPI backend described by `http://localhost:8000/openapi.json`.

Covers the whole of the **person's** surface: auth, projects, tasks, labels,
agents, repos, API keys, and the read side of runs — executions, their event
transcript, their code changes and the interventions they are blocked on.

**Not covered, deliberately.** Every write on the ingest path belongs to the
observer bot and is API-key-only at the server, so a session token gets `401`
there by design:

| Endpoint | Whose job |
| --- | --- |
| `POST /executions` | The runner opens a run; there is no form for it |
| `POST /executions/{id}/start\|complete\|fail\|cancel` | The runner drives the state machine |
| `POST /executions/{id}/usage` | Reported by the runner |
| `POST /executions/{id}/events` | The bot writes the transcript |
| `POST /executions/{id}/interventions` | The *agent* asks; the person answers |
| `POST /executions/{id}/repos`, `.../head`, `.../land` | Git state is recorded by the runner |
| `GET /api-keys/verify` | A bot checking its own key at startup |

That split is the point: every line of a transcript has to be attributable to a
credential issued for an agent. If a screen seems to need one of these, the
scope has been misread.

The UI on top of it lives in `app/(app)/`, with mutations in `app/actions/`. It
is plain Tailwind against the design tokens in `app/globals.css` — see
`app/_components/README.md`.

## Layout

| File | Role |
| --- | --- |
| `types.ts` | Request/response types and enums mirroring the OpenAPI schema |
| `errors.ts` | `ApiError`, `ApiNetworkError`, `SessionExpiredError` + body normalisation |
| `http.ts` | `fetch` wrapper: query serialisation, envelope unwrapping, error mapping |
| `endpoints/*.ts` | One module per tag, written against a `Requester` |
| `client.ts` | Assembles the namespaces into an `ApiClient` |
| `session.ts` | httpOnly cookie token storage (server-only) |
| `refresh.ts` | Token refresh, free of `next/headers` so the edge proxy can use it |
| `server.ts` | **The client most app code should use** — session-bound, refreshes on 401 |

## Usage

Server Components, Server Actions and Route Handlers:

```ts
import { api, getCurrentUser } from "@/lib/api/server";

const user = await getCurrentUser();               // null when signed out
const page = await api.projects.list({ limit: 20, sort_by: "updated_at", order: "desc" });
const task = await api.tasks.create({ project_id: page.items[0].id, name: "Ship it" });
await api.tasks.attachLabel(task.id, labelId);
await api.tasks.remove(task.id);                    // 200 with a null payload

// The inbox: pending only, oldest first — the agent blocked longest is losing
// the most time.
const waiting = await api.interventions.list({ limit: 50 });
await api.interventions.approve(waiting.items[0].id, { reasoning: "Run it at 03:00." });

// Runs are read-only here, apart from deletion.
const run = await api.executions.get(id);           // `repos` inlined; the list omits them
await api.executions.remove(id, { purge: true });   // 409 history_exists without purge
```

Unauthenticated or custom transport (scripts, tests):

```ts
import { createApiClient } from "@/lib/api";

const client = createApiClient({ baseUrl: "http://localhost:8000" });
await client.auth.register({ name, password });

// Inject a fake transport in tests:
createApiClient({ fetchImpl: myFetchStub });
```

Import from `@/lib/api` (safe anywhere) rather than `@/lib/api/server` (server-only)
in code a Client Component might reach.

## Two paginations, and using the wrong one is a real bug

Everything is offset-paginated as `Page<T>` — `{items, total, limit, offset}` —
**except the event transcript**, which is cursored on `seq`:

```ts
// Offset: you get a `total`, so page numbers are possible.
const runs = await api.executions.list({ limit: 50, offset: 50 });

// Cursor: no `total`. Start at 0, then hand back what you were given.
let after = 0;
for (;;) {
  const page = await api.executions.events(id, { after_seq: after, limit: 100 });
  if (page.items.length === 0) break;              // caught up
  after = page.next_after_seq ?? after;
}
```

The transcript is appended to while it is being read. An offset shifts under
every event that arrives, so page two would skip or repeat whatever landed in
between. The same property is what makes tailing a live run work: ask again with
the cursor already held, and an empty page means there is nothing new.

`GET /executions/{id}/repos` returns a bare list, **not** a `Page`.

## The response envelope

Every endpoint answers with the same wrapper, success or failure:

```json
{"ok": true, "data": { "...": "the payload" }, "error": null, "request_id": "eda5ce6d…"}
{"ok": false, "data": null,
 "error": {"code": "conflict", "message": "A label named 'dup' already exists", "details": null},
 "request_id": "27b6324c…"}
```

`http.ts` unwraps it, so callers get the payload directly and never see `ok`/`data`.
Endpoints that return nothing (deletes, logout) answer `200` with `data: null` — there
are no `204`s. A 2xx whose body isn't a readable envelope throws `ApiUnwrapError`,
mirroring the backend's own `UnwrapError`.

To trace a call, pass `onResponse` to `createRequester` — it receives the
`request_id` without changing any return type.

## Error handling

Every non-2xx throws `ApiError`; transport failures throw `ApiNetworkError`.

```ts
import { ApiError } from "@/lib/api";

try {
  await api.projects.create({ name: "" });
} catch (error) {
  if (error instanceof ApiError) {
    error.status;       // 422
    error.code;         // "validation_error" — the stable part of the contract
    error.message;      // written for the reader; may be reworded, so don't match on it
    error.fieldErrors;  // { name: "String should have at least 1 character" }
    error.formError;    // whole-payload complaints, e.g. bad date ranges
    error.requestId;    // quote this in bug reports — it is in the backend logs
    error.isConflict;   // also: isBadRequest / isUnauthorized / isNotFound
                        //       isValidation / isRateLimited / isServerError
  }
}
```

`code` is an `ErrorCode` union covering the documented set, including the
domain-specific `unknown_labels`, `duplicate_label_name` and `invalid_date_range`.
Only `validation_error` carries `details`; it arrives as `FieldError[]` with the
`body.` prefix stripped, so `body.name` keys as `name` and drops straight into a
form. Complaints about the payload as a whole arrive keyed `_` and are also
exposed as `formError`.

## Auth

Tokens live in httpOnly cookies (`cerebral_access_token`, `cerebral_refresh_token`),
never in `localStorage`. Every request goes through the Next.js server, which is
the only place the token needs to be readable — and httpOnly keeps it away from
XSS.

That architecture also sidesteps a live CORS bug. The backend now *does* send
CORS headers, but `app/main.py` declares
`allow_methods=["GET", "POST", "PUT", "DELETE"]` — no `PATCH`. Verified against
the running API:

```
OPTIONS /api/v1/tasks  Access-Control-Request-Method: POST   -> 200 OK
OPTIONS /api/v1/tasks  Access-Control-Request-Method: PATCH  -> 400 Disallowed CORS method
```

Every update endpoint is a `PATCH`, so a browser calling the API directly could
not update anything. Nothing here does — server-side `fetch` sends no preflight,
and a server-side `PATCH` reaches the app and fails only on auth — so this UI is
unaffected. It still wants fixing for any future browser-direct client, and is
flagged to the API owner rather than worked around.

Also worth raising: `allow_origins=["*"]` with `allow_credentials=True` makes
Starlette echo whatever `Origin` it is sent, which means any site can make
credentialed requests. Fine for local development, not for anywhere real.

Refresh happens in two places:

- **`proxy.ts`** refreshes proactively when the access token is within 60s of its
  `exp`. This is the main path, because it runs in a context that can write cookies.
- **`server.ts`** refreshes reactively on a 401. During a Server Component render
  Next.js forbids cookie writes, so the retry succeeds but the rotated refresh
  token may not persist; the proxy then cleans up on the next navigation.

Refresh tokens **do** rotate — refreshing revokes the previous one (verified: reusing
it returns 401). That is why the proactive proxy path matters: it is the only place
the new pair can be written back reliably.

`getTokenExpiry` reads the `exp` claim without verifying the signature — deciding
*when to refresh* is all it is used for, and the backend remains the only authority
on validity.

## Configuration

`API_BASE_URL` in `.env.local` (defaults to `http://localhost:8000`).
Note `.gitignore` ignores all `.env*`, so `.env.example` needs `git add -f` to be committed.
