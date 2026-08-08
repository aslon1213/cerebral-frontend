# Cerebral API client

Typed client for the FastAPI backend described by `http://localhost:8000/openapi.json`.
All 25 endpoints are covered: auth, projects, tasks, labels.

The CRUD UI built on top of it lives in `app/(app)/` (projects, tasks, labels),
with mutations in `app/actions/`. It is built from [Polaris web components](https://shopify.dev/docs/api/app-home/web-components) —
see `app/_components/README.md` for how those integrate with Server Actions.

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
never in `localStorage`. That is forced by the backend: it sends no CORS headers
and rejects `OPTIONS` preflight with 405, so the browser cannot call it directly.
Every request goes through the Next.js server, which is the only place the token
needs to be readable — and httpOnly keeps it away from XSS.

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
