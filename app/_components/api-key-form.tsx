"use client";

import { useActionState, useState } from "react";

import { createApiKeyAction, type CreateKeyState } from "@/app/actions/api-keys";
import { API_KEY_SCOPES, DEFAULT_API_KEY_SCOPES, type AgentResponse } from "@/lib/api/types";

import { FormError, SubmitButton } from "./form-ui";
import { KeyIcon } from "./icons";
import { Button, Checkbox, Field, Input, Select, cx } from "./ui";

const EMPTY: CreateKeyState = {};

/** What each scope actually lets a bot do, rather than restating its name. */
const SCOPE_BLURB: Record<string, string> = {
  "executions:read": "Read runs and their transcripts",
  "executions:write": "Open runs, append events, ask for approval",
  "repos:read": "Read repos and change history",
  "repos:write": "Record code changes and land work",
};

export function ApiKeyForm({
  agents,
  defaultAgentId,
}: {
  agents: AgentResponse[];
  defaultAgentId?: string;
}) {
  const [state, action] = useActionState(createApiKeyAction, EMPTY);

  if (state.secret) {
    return <KeyReveal state={state} />;
  }

  return (
    <form action={action} className="flex flex-col gap-[16px]">
      <FormError message={state.error} />

      <div className="flex flex-col gap-[16px] sm:flex-row sm:items-start">
        <Field
          label="Name"
          htmlFor="key-name"
          error={state.fieldErrors?.name}
          hint="How you will recognise it in this list later."
          className="sm:flex-1"
        >
          <Input
            id="key-name"
            name="name"
            required
            placeholder="nightly-refactor observer"
            invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Agent"
          htmlFor="key-agent"
          error={state.fieldErrors?.agent_id}
          hint="Binds runs made with this key to that agent."
          className="sm:w-[220px]"
        >
          <Select id="key-agent" name="agent_id" defaultValue={defaultAgentId ?? ""}>
            <option value="">Not bound to an agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Expires"
          htmlFor="key-expires"
          error={state.fieldErrors?.expires_at}
          hint="Optional. Blank means it never expires."
          className="sm:w-[180px]"
        >
          <Input id="key-expires" name="expires_at" type="date" />
        </Field>
      </div>

      <Field label="Scopes" error={state.fieldErrors?.scopes}>
        <div className="flex flex-col gap-[2px] pt-[2px]">
          {API_KEY_SCOPES.map((scope) => (
            <Checkbox
              key={scope}
              name="scopes"
              value={scope}
              defaultChecked={DEFAULT_API_KEY_SCOPES.includes(scope)}
              label={
                <span className="flex flex-wrap items-baseline gap-x-[8px]">
                  <span className="font-mono text-mini">{scope}</span>
                  <span className="text-mini text-fg-faint">{SCOPE_BLURB[scope]}</span>
                </span>
              }
            />
          ))}
        </div>
      </Field>

      <div className="flex justify-end">
        <SubmitButton>
          <KeyIcon size={13} />
          Issue key
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * The one moment the secret exists in the UI.
 *
 * `key` is returned by exactly one call and is not recoverable from any other,
 * so this deliberately does not look like a success toast that can be scrolled
 * past. It takes the whole panel, it says plainly that it will not be shown
 * again, and it does not offer a way to dismiss it until the key has been
 * copied — losing it means issuing a new one and revoking this.
 */
function KeyReveal({ state }: { state: CreateKeyState }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.secret ?? "");
      setCopied(true);
      setCopyFailed(false);
    } catch {
      // Clipboard access can be refused outright; the key is on screen and
      // selectable, so say to copy it by hand rather than pretending it worked.
      setCopyFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-[12px] rounded-panel border border-orange/45 bg-orange/8 p-[16px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <KeyIcon size={15} className="text-orange" />
        <h3 className="text-small font-medium text-fg">
          Copy this key now — it will not be shown again
        </h3>
      </div>

      <p className="text-small text-fg-muted">
        {state.keyName} has been issued. Cerebral stores only its prefix{" "}
        <span className="font-mono text-mini text-fg">{state.prefix}</span>, so this is
        the only time the full key exists anywhere you can read it. If you lose it, revoke
        this key and issue another.
      </p>

      <div className="flex flex-wrap items-center gap-[10px]">
        {/*
          Selectable and wrapping rather than truncated: if the clipboard is
          unavailable, reading it off the screen has to still be possible.
        */}
        <code className="min-w-0 flex-1 rounded-input border border-line-input bg-surface-sunken px-[12px] py-[10px] font-mono text-mini leading-[18px] break-all text-fg select-all">
          {state.secret}
        </code>
        <Button
          type="button"
          variant={copied ? "secondary" : "primary"}
          onClick={copy}
          className={cx("shrink-0", copied && "text-green")}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {copyFailed ? (
        <p className="text-mini text-red">
          The clipboard was not available. Select the key above and copy it manually.
        </p>
      ) : null}

      <p className="text-mini text-fg-faint">
        Give it to the observer bot as the <span className="font-mono">X-API-Key</span>{" "}
        header. Never put it in a browser.
      </p>

      {copied ? (
        <div className="flex justify-end">
          {/* Reloading is what clears the secret from the page. */}
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => window.location.reload()}
          >
            Done, hide it
          </Button>
        </div>
      ) : null}
    </div>
  );
}
