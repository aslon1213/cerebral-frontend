/**
 * Seed the local dev database with realistic runs. Development only.
 *
 *     node scripts/seed-dev-data.mjs        # or: npm run seed:dev
 *
 * The read screens — the inbox, the transcript, the code history — cannot be
 * exercised without runs, and a run can only be created by something holding an
 * API key. So this plays the part of an observer bot: person-side objects
 * (projects, tasks, agents, repos, keys) are written with a session token, and
 * everything on the ingest path is written with an API key, because that is the
 * only credential the server accepts for it.
 *
 * Idempotent. It purges the runs it made last time before writing them again,
 * and revokes the keys it issued last time before issuing new ones — a key's
 * secret is not recoverable, so a rerun cannot reuse the previous one.
 *
 * Creates (or signs in as) a user named `demo`. Override with SEED_USER /
 * SEED_PASS, and the target with API_BASE_URL.
 *
 * DESTRUCTIVE: it purges every execution belonging to that user, including the
 * transcripts and code changes recorded against them. Point it at a development
 * database and nothing else.
 */

import { createHash } from "node:crypto";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const USER = process.env.SEED_USER ?? "demo";
const PASS = process.env.SEED_PASS ?? "demo-password-123";

let session = null;

async function call(path, { method = "GET", body, token, apiKey } = {}) {
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const err = new Error(
      `${method} ${path} -> ${res.status} ${JSON.stringify(parsed?.error ?? parsed)}`,
    );
    err.status = res.status;
    err.code = parsed?.error?.code;
    throw err;
  }
  return parsed?.data;
}

const asUser = (path, opts = {}) => call(path, { ...opts, token: session });
const asBot = (key) => (path, opts = {}) => call(path, { ...opts, apiKey: key });

/** A plausible 40-hex commit id, deterministic per label so reruns read alike. */
function sha(label) {
  return createHash("sha1").update(label).digest("hex");
}

async function ensureSession() {
  try {
    const tokens = await call("/api/v1/auth/login", {
      method: "POST",
      body: { name: USER, password: PASS },
    });
    session = tokens.access_token;
    console.log(`signed in as ${USER}`);
  } catch (error) {
    if (error.status !== 401 && error.status !== 404) throw error;
    await call("/api/v1/auth/register", {
      method: "POST",
      body: { name: USER, password: PASS },
    });
    const tokens = await call("/api/v1/auth/login", {
      method: "POST",
      body: { name: USER, password: PASS },
    });
    session = tokens.access_token;
    console.log(`registered and signed in as ${USER}`);
  }
}

/** Create, or reuse what a previous run of this script already made. */
async function ensure(kind, lookup, create) {
  try {
    return await lookup();
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const made = await create();
  console.log(`  created ${kind}: ${made.name ?? made.id}`);
  return made;
}

async function main() {
  await ensureSession();

  // --- The things runs are made of -----------------------------------------
  console.log("\nperson-side objects");

  const project = await ensure(
    "project",
    async () => {
      const page = await asUser("/api/v1/projects?q=Payments%20platform&limit=1");
      if (page.items.length === 0) throw Object.assign(new Error("none"), { status: 404 });
      return page.items[0];
    },
    () =>
      asUser("/api/v1/projects", {
        method: "POST",
        body: {
          name: "Payments platform",
          description: "Card processing, payouts and the ledger behind them.",
          priority: "high",
          goals: ["Cut auth latency below 200ms", "Retire the legacy charge path"],
        },
      }),
  );

  // POST /repos connects rather than creates: idempotent by name, and it
  // answers {repo, created} rather than a bare repo.
  const connected = await asUser("/api/v1/repos", {
    method: "POST",
    body: {
      name: "cerebral-api",
      local_path: "/srv/repos/cerebral-api",
      default_branch: "main",
      remote_url: "git@github.com:acme/cerebral-api.git",
    },
  });
  const repo = connected.repo;
  console.log(`  ${connected.created ? "created" : "reused"} repo: ${repo.name}`);

  const nightly = await ensure(
    "agent",
    () => asUser("/api/v1/agents/by-name/nightly-refactor"),
    () =>
      asUser("/api/v1/agents", {
        method: "POST",
        body: {
          name: "nightly-refactor",
          description: "Runs after midnight, takes on the backlog nobody wants.",
          default_model: "claude-opus-5",
          is_active: true,
        },
      }),
  );

  const reviewer = await ensure(
    "agent",
    () => asUser("/api/v1/agents/by-name/qa-reviewer"),
    () =>
      asUser("/api/v1/agents", {
        method: "POST",
        body: {
          name: "qa-reviewer",
          description: "Reads what the others wrote and asks for a second opinion.",
          default_model: "claude-sonnet-5",
          is_active: true,
        },
      }),
  );

  // A key per agent: the key is what makes a run attributable to that agent.
  //
  // A key's secret is not recoverable, so a rerun cannot reuse the previous
  // one — it has to issue another. Revoking what this script issued before
  // stops that turning into a growing pile of live credentials.
  async function keyFor(agent) {
    const existing = await asUser(`/api/v1/api-keys?agent_id=${agent.id}&limit=100`);
    for (const key of existing.items) {
      await asUser(`/api/v1/api-keys/${key.id}`, { method: "DELETE" });
    }
    if (existing.items.length > 0) {
      console.log(`  revoked ${existing.items.length} previous key(s) for ${agent.name}`);
    }
    const made = await asUser("/api/v1/api-keys", {
      method: "POST",
      body: {
        name: `${agent.name} observer (seed)`,
        agent_id: agent.id,
        scopes: ["executions:read", "executions:write", "repos:read", "repos:write"],
      },
    });
    return made.key;
  }

  const nightlyKey = await keyFor(nightly);
  const reviewerKey = await keyFor(reviewer);

  async function task(name, description, status = "in_progress") {
    return ensure(
      "task",
      async () => {
        const page = await asUser(
          `/api/v1/tasks?project_id=${project.id}&q=${encodeURIComponent(name)}&limit=1`,
        );
        const hit = page.items.find((t) => t.name === name);
        if (!hit) throw Object.assign(new Error("none"), { status: 404 });
        return hit;
      },
      () =>
        asUser("/api/v1/tasks", {
          method: "POST",
          body: { project_id: project.id, name, description, status, priority: "high" },
        }),
    );
  }

  const authTask = await task(
    "Replace the hand-rolled session check in auth",
    "The session check in app/auth.py predates the token service and re-implements half of it.",
  );
  const chargeTask = await task(
    "Make the charge path idempotent",
    "A retried charge can double-bill. Needs an idempotency key threaded through.",
  );
  const ledgerTask = await task(
    "Backfill ledger entries for refunded charges",
    "Refunds issued before March never got a matching ledger row.",
  );

  // --- Clear previous runs so the script is re-runnable ----------------------
  //
  // Deleting a run that recorded anything is a 409 without `purge`, and purging
  // destroys its events and code changes. That is the right call for seed data
  // and the wrong one everywhere else.
  const stale = await asUser("/api/v1/executions?limit=200");
  if (stale.total > 0) {
    console.log(`\nclearing ${stale.total} previous run(s)`);
    for (const execution of stale.items) {
      await asUser(`/api/v1/executions/${execution.id}?purge=true`, { method: "DELETE" });
    }
  }

  // --- Runs, written as the bot ---------------------------------------------
  console.log("\nruns (via the API-key ingest path)");

  /**
   * Walk one run through the state machine, writing its transcript as it goes.
   * Mirrors what an observer bot does alongside a real agent.
   */
  async function run(key, { taskId, model, base, events, intervention, land, finish, usage }) {
    const bot = asBot(key);
    const execution = await bot("/api/v1/executions", {
      method: "POST",
      body: {
        project_id: project.id,
        task_id: taskId,
        executor_type: "ai_agent",
        model,
        provider: "anthropic",
        additional_context: { trigger: "schedule", branch_hint: "main" },
        repos: [{ repo_id: repo.id, base_commit_sha: base }],
      },
    });
    const id = execution.id;
    await bot(`/api/v1/executions/${id}/start`, { method: "POST" });

    // Events are appended in order; a tool_result points back at its call.
    const byRef = {};
    for (const event of events) {
      const { ref, parent, ...rest } = event;
      const written = await bot(`/api/v1/executions/${id}/events`, {
        method: "POST",
        body: { ...rest, parent_event_id: parent ? byRef[parent] : null },
      });
      if (ref) byRef[ref] = written.id;
    }

    if (land) {
      await bot(`/api/v1/executions/${id}/repos/${repo.id}/head`, {
        method: "POST",
        body: { head_commit_sha: land.head },
      });
    }

    if (usage) {
      await bot(`/api/v1/executions/${id}/usage`, { method: "POST", body: usage });
    }

    if (intervention) {
      await bot(`/api/v1/executions/${id}/interventions`, {
        method: "POST",
        body: intervention,
      });
    }

    if (land?.landed) {
      await bot(`/api/v1/executions/${id}/repos/${repo.id}/land`, {
        method: "POST",
        body: {
          landed_branch: "main",
          landed_commit_shas: land.landed,
          merge_commit_sha: land.merge ?? null,
        },
      });
    }

    if (finish) {
      await bot(`/api/v1/executions/${id}/${finish.verb}`, {
        method: "POST",
        body: finish.body,
      });
    }

    const final = await bot(`/api/v1/executions/${id}`);
    console.log(`  ${final.status.padEnd(17)} attempt ${final.attempt}  ${id}`);
    return final;
  }

  const change = (path, type, added, deleted, extra = {}) => ({
    repo_id: repo.id,
    change_type: type,
    path,
    language: "python",
    before_blob: type === "created" ? null : sha(`before:${path}:${added}`),
    after_blob: type === "deleted" ? null : sha(`after:${path}:${added}`),
    lines_added: added,
    lines_deleted: deleted,
    ...extra,
  });

  // 1. Succeeded and landed — the run the history screen is built to explain.
  await run(nightlyKey, {
    taskId: authTask.id,
    model: "claude-opus-5",
    base: sha("auth-base-1"),
    usage: { input_tokens: 48_200, output_tokens: 6_140, cache_read_tokens: 31_000, cost_usd: "0.94" },
    events: [
      {
        event_type: "chat_message",
        actor_type: "user",
        payload: {
          reasoning: null,
          data: {
            text: "The session check in app/auth.py predates the token service. Replace it, keep the public signature.",
          },
        },
      },
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "Reading app/auth.py first. The public signature has to survive — six call sites depend on `require_session(request)` returning a Session or raising. So the change is internal: keep the name and the exception contract, swap the body for a call into the token service.",
          data: {},
        },
      },
      {
        ref: "read",
        event_type: "tool_call",
        actor_type: "agent",
        payload: {
          reasoning: "Read the file before touching it.",
          data: { tool: "read_file", arguments: { path: "app/auth.py", range: [1, 120] } },
        },
      },
      {
        parent: "read",
        event_type: "tool_result",
        actor_type: "agent",
        payload: {
          reasoning: null,
          data: {
            ok: true,
            lines: 118,
            summary:
              "require_session() parses the cookie, verifies an HMAC by hand, and rebuilds a Session. Duplicates TokenService.verify() almost exactly.",
          },
        },
      },
      {
        event_type: "decision",
        actor_type: "agent",
        payload: {
          reasoning:
            "Two options: delete require_session and update six call sites, or keep it as a thin wrapper over TokenService.verify. Choosing the wrapper — it keeps the diff to one file and leaves the call sites reviewable on their own later. The hand-rolled HMAC goes either way; that is the part that was actually wrong.",
          data: { chosen: "thin-wrapper", rejected: ["delete-and-update-callers"] },
        },
      },
      {
        event_type: "code_change",
        actor_type: "agent",
        cerebral_commit_sha: sha("auth-c1"),
        payload: {
          reasoning:
            "Replaced the hand-rolled HMAC check with TokenService.verify(). The old code compared digests with `==`, which is not constant-time — that is a real timing leak, not just duplication. Kept require_session's signature and its 401 behaviour so no caller changes.",
          data: {},
        },
        code_changes: [
          change("app/auth.py", "modified", 18, 47, {
            diff: [
              {
                old: "    expected = hmac.new(secret, payload, sha256).hexdigest()\n    if digest == expected:",
                new: "    session = token_service.verify(raw)\n    if session is not None:",
                line_start: 61,
                line_end: 62,
              },
            ],
          }),
        ],
      },
      {
        event_type: "code_change",
        actor_type: "agent",
        cerebral_commit_sha: sha("auth-c2"),
        payload: {
          reasoning:
            "The hand-rolled path had its own tests asserting on the digest format. Those assertions describe the implementation that just went away, so they were rewritten against the behaviour instead: a valid token yields a Session, a tampered one raises.",
          data: {},
        },
        code_changes: [change("tests/test_auth.py", "modified", 34, 22)],
      },
      {
        event_type: "status_change",
        actor_type: "system",
        payload: { reasoning: null, data: { from: "running", to: "succeeded" } },
      },
    ],
    land: {
      head: sha("auth-head-1"),
      landed: [sha("auth-landed-1a"), sha("auth-landed-1b")],
      merge: sha("auth-merge-1"),
    },
    finish: {
      verb: "complete",
      body: { result: { files_changed: 2, tests_run: 41, tests_passed: 41 } },
    },
  });

  // 2. Blocked on an approval — the inbox's reason to exist.
  await run(nightlyKey, {
    taskId: chargeTask.id,
    model: "claude-opus-5",
    base: sha("charge-base-1"),
    usage: { input_tokens: 22_400, output_tokens: 3_900, cache_read_tokens: 12_000, cost_usd: "0.41" },
    events: [
      {
        event_type: "chat_message",
        actor_type: "user",
        payload: {
          reasoning: null,
          data: { text: "A retried charge can double-bill. Thread an idempotency key through the charge path." },
        },
      },
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "The retry lives in the HTTP client, so the same charge can reach the processor twice with no way to tell the calls apart. An idempotency key has to be minted at the call site and travel with the request. That means a new column on charges, which is a migration against a live table.",
          data: {},
        },
      },
      {
        ref: "grep",
        event_type: "tool_call",
        actor_type: "agent",
        payload: {
          reasoning: "Find every place a charge is created.",
          data: { tool: "grep", arguments: { pattern: "processor\\.charge\\(", path: "app/" } },
        },
      },
      {
        parent: "grep",
        event_type: "tool_result",
        actor_type: "agent",
        payload: {
          reasoning: null,
          data: {
            ok: true,
            matches: 3,
            files: ["app/payments/charge.py", "app/payments/retry.py", "app/admin/manual_charge.py"],
          },
        },
      },
      {
        event_type: "code_change",
        actor_type: "agent",
        cerebral_commit_sha: sha("charge-c1"),
        payload: {
          reasoning:
            "Mint the key where the charge is first described, not where it is sent — a retry has to reuse the original key, and only the call site knows the two attempts are the same charge.",
          data: {},
        },
        code_changes: [change("app/payments/charge.py", "modified", 26, 4)],
      },
    ],
    land: { head: sha("charge-head-1") },
    intervention: {
      kind: "approval",
      reasoning:
        "The column has to exist before the code that writes it ships, and this table takes writes continuously.",
      request: {
        summary: "Run a migration that adds charges.idempotency_key against the live table",
        migration: "20260809_01_add_idempotency_key.sql",
        statement: "ALTER TABLE charges ADD COLUMN idempotency_key text UNIQUE",
        estimated_lock: "~40s on 4.2M rows",
        risk: "Writes to charges block for the duration of the lock.",
        rollback: "DROP COLUMN, safe while no code reads it",
      },
    },
  });

  // 3. Blocked on a question — the kind that must be answered, not approved.
  await run(reviewerKey, {
    taskId: ledgerTask.id,
    model: "claude-sonnet-5",
    base: sha("ledger-base-1"),
    usage: { input_tokens: 9_800, output_tokens: 1_450, cache_read_tokens: 4_000, cost_usd: "0.12" },
    events: [
      {
        event_type: "chat_message",
        actor_type: "user",
        payload: {
          reasoning: null,
          data: { text: "Backfill ledger entries for refunds issued before March." },
        },
      },
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "There are 1,204 refunds with no ledger row. 63 of them are partial refunds against charges that were later fully refunded, so the amount to post is ambiguous — either the partial amount at the time, or nothing because the full refund already covers it. Both are defensible and they disagree by $18,400. This is a question, not a decision I should make.",
          data: { affected_rows: 1204, ambiguous_rows: 63, disagreement_usd: 18400 },
        },
      },
    ],
    intervention: {
      kind: "input_required",
      reasoning: "The two readings disagree by $18,400 and I have no basis in the code to pick one.",
      request: {
        question:
          "For a partial refund later superseded by a full refund, should the backfill post the partial amount or skip the row?",
        options: ["post_partial", "skip_row"],
        affected_rows: 63,
        disagreement_usd: 18400,
      },
    },
  });

  // 4. A second attempt at the same file — history needs more than one entry.
  await run(nightlyKey, {
    taskId: authTask.id,
    model: "claude-opus-5",
    base: sha("auth-base-2"),
    usage: { input_tokens: 15_300, output_tokens: 2_100, cache_read_tokens: 8_000, cost_usd: "0.22" },
    events: [
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "The wrapper shipped, but require_session still swallows a TokenExpired and returns 401. Callers cannot tell an expired session from a forged one, and the refresh flow needs to. Splitting the exception.",
          data: {},
        },
      },
      {
        event_type: "code_change",
        actor_type: "agent",
        cerebral_commit_sha: sha("auth-c3"),
        payload: {
          reasoning:
            "Let TokenExpired escape as its own 401 subtype so the refresh middleware can catch it. A forged token still fails the same way it always did — the change only separates two cases that were being flattened into one.",
          data: {},
        },
        code_changes: [change("app/auth.py", "modified", 11, 3)],
      },
    ],
    land: {
      head: sha("auth-head-2"),
      landed: [sha("auth-landed-2")],
      merge: sha("auth-merge-2"),
    },
    finish: { verb: "complete", body: { result: { files_changed: 1, tests_run: 43, tests_passed: 43 } } },
  });

  // 5. Failed, retryable — the error card needs something real to show.
  await run(reviewerKey, {
    taskId: chargeTask.id,
    model: "claude-sonnet-5",
    base: sha("charge-base-2"),
    usage: { input_tokens: 4_100, output_tokens: 320, cache_read_tokens: 0, cost_usd: "0.04" },
    events: [
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning: "Re-running the charge suite against the migrated schema before reviewing the diff.",
          data: {},
        },
      },
      {
        ref: "tests",
        event_type: "tool_call",
        actor_type: "agent",
        payload: {
          reasoning: null,
          data: { tool: "shell", arguments: { command: "pytest tests/payments -x" } },
        },
      },
      {
        parent: "tests",
        event_type: "tool_result",
        actor_type: "agent",
        payload: {
          reasoning: null,
          data: {
            ok: false,
            exit_code: 1,
            stderr: "psycopg.OperationalError: connection to server at 127.0.0.1:5432 refused",
          },
        },
      },
    ],
    finish: {
      verb: "fail",
      body: {
        error: {
          code: "database_unavailable",
          message: "The test database refused connections for the whole run.",
          retryable: true,
          details: { host: "127.0.0.1:5432", attempts: 3 },
        },
      },
    },
  });

  // 6. Left running, so the transcript has something live to poll.
  await run(nightlyKey, {
    taskId: ledgerTask.id,
    model: "claude-opus-5",
    base: sha("ledger-base-2"),
    events: [
      {
        event_type: "memory_loaded",
        actor_type: "system",
        payload: { reasoning: null, data: { entries: 12, source: "project:Payments platform" } },
      },
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "Starting on the unambiguous 1,141 rows while the partial-refund question is still open. Those need no decision and the work is independent.",
          data: {},
        },
      },
      {
        ref: "batch",
        event_type: "tool_call",
        actor_type: "agent",
        payload: {
          reasoning: "Posting in batches of 200 so a failure costs one batch, not the run.",
          data: { tool: "shell", arguments: { command: "python -m ledger.backfill --batch 200" } },
        },
      },
    ],
    land: { head: sha("ledger-head-1") },
  });

  // 7. A qa_review ask, so all three intervention kinds are represented.
  await run(reviewerKey, {
    taskId: authTask.id,
    model: "claude-sonnet-5",
    base: sha("auth-base-3"),
    events: [
      {
        event_type: "reasoning",
        actor_type: "agent",
        payload: {
          reasoning:
            "Reviewed both auth changes end to end. The timing leak is genuinely gone and the tests now describe behaviour rather than digests. One thing I will not sign off alone: require_session is public API and its exception contract changed shape, even though the 401 status did not.",
          data: {},
        },
      },
    ],
    intervention: {
      kind: "qa_review",
      reasoning: "The behaviour is right; the contract change is a judgement call above my pay grade.",
      request: {
        summary: "Sign off the auth rewrite before it goes out",
        files_reviewed: ["app/auth.py", "tests/test_auth.py"],
        findings: [
          "Constant-time comparison restored — the original == on digests was a timing leak.",
          "TokenExpired now escapes separately; still a 401, but a different subtype.",
        ],
        concern: "require_session is public API. The status is unchanged, the exception type is not.",
      },
    },
  });

  const pending = await asUser("/api/v1/interventions?limit=50");
  console.log(`\npending interventions: ${pending.total}`);
  for (const item of pending.items) {
    console.log(`  ${item.kind.padEnd(15)} ${item.id}`);
  }
  console.log(`\nsign in at http://localhost:3000/login as ${USER} / ${PASS}`);
}

main().catch((error) => {
  console.error("\nSEED FAILED:", error.message);
  process.exit(1);
});
