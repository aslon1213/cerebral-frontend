import { ApiKeyForm } from "@/app/_components/api-key-form";
import { FilterForm, SubmitButton } from "@/app/_components/form-ui";
import { KeyIcon } from "@/app/_components/icons";
import { List, ListRow, RowActions, RowControls, RowMeta } from "@/app/_components/list";
import {
  Card,
  Container,
  EmptyState,
  PageHeader,
  Section,
  TextLink,
  cx,
} from "@/app/_components/ui";
import { revokeApiKeyAction } from "@/app/actions/api-keys";
import { api } from "@/lib/api/server";
import { formatExact, formatRelative } from "@/lib/format";
import { apiKeyState, type ApiKeyResponse } from "@/lib/api/types";

export const metadata = { title: "API keys" };

/**
 * Credentials for observer bots — the one machine-facing thing on the person's
 * side of the product.
 *
 * Issuing a key is something a person does; using one is not. Nothing in this
 * browser ever sends a key, and the only moment it exists here is the instant
 * after it is created.
 */
export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ agent_id?: string; show_revoked?: string }>;
}) {
  const { agent_id: agentId, show_revoked: showRevoked } = await searchParams;
  const includeRevoked = showRevoked === "1";

  const [page, agents] = await Promise.all([
    api.apiKeys.list({
      agent_id: agentId || undefined,
      include_revoked: includeRevoked,
      limit: 200,
    }),
    api.agents.list({ limit: 200, sort_by: "name", order: "asc" }),
  ]);

  const agentNames = new Map(agents.items.map((agent) => [agent.id, agent.name]));

  return (
    <>
      <PageHeader
        title="API keys"
        icon={<KeyIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "key" : "keys"}
          </span>
        }
      />

      <Container className="flex flex-col gap-[20px] py-[20px]">
        <Section heading="Issue a key">
          <Card className="p-[16px]">
            <ApiKeyForm agents={agents.items} defaultAgentId={agentId} />
          </Card>
        </Section>

        <Section
          heading="Keys"
          action={
            <FilterForm className="flex items-center gap-[10px]">
              {agentId ? <input type="hidden" name="agent_id" value={agentId} /> : null}
              {/*
                A checkbox does not fire this form's change handler (it only
                watches selects), so the label carries a plain link instead —
                which also keeps the state in the URL.
              */}
              <TextLink
                href={
                  includeRevoked
                    ? buildHref({ agent_id: agentId })
                    : buildHref({ agent_id: agentId, show_revoked: "1" })
                }
                className="text-mini text-fg-subtle hover:text-fg"
              >
                {includeRevoked ? "Hide revoked" : "Show revoked"}
              </TextLink>
              {agentId ? (
                <TextLink
                  href="/api-keys"
                  className="text-mini text-fg-subtle hover:text-fg"
                >
                  All agents
                </TextLink>
              ) : null}
            </FilterForm>
          }
        >
          {page.items.length === 0 ? (
            <EmptyState icon={<KeyIcon size={15} />} title="No keys issued">
              An observer bot authenticates with a key. Issue one above, give it to
              the bot as its <span className="font-mono">X-API-Key</span> header, and
              the runs it records will appear under Runs.
            </EmptyState>
          ) : (
            <List>
              {page.items.map((key) => (
                <KeyRow
                  key={key.id}
                  apiKey={key}
                  agentName={key.agent_id ? agentNames.get(key.agent_id) : undefined}
                />
              ))}
            </List>
          )}
        </Section>
      </Container>
    </>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value);
  }
  const qs = query.toString();
  return qs === "" ? "/api-keys" : `/api-keys?${qs}`;
}

function KeyRow({
  apiKey,
  agentName,
}: {
  apiKey: ApiKeyResponse;
  agentName?: string;
}) {
  const state = apiKeyState(apiKey);
  const active = state === "active";

  return (
    <ListRow className={active ? undefined : "opacity-65"}>
      <KeyIcon size={15} className={active ? "text-fg-subtle" : "text-fg-faint"} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cx("truncate text-normal", active ? "text-fg" : "text-fg-subtle")}>
          {apiKey.name}
        </span>
        <span className="flex flex-wrap items-center gap-x-[8px] text-micro leading-[16px] text-fg-faint">
          {/* The prefix is all that is stored of the key itself. */}
          <span className="font-mono">{apiKey.prefix}…</span>
          {agentName ? <span>· {agentName}</span> : <span>· not bound to an agent</span>}
          <span className="hidden font-mono sm:inline">· {apiKey.scopes.join(" ")}</span>
        </span>
      </span>

      <RowControls>
        {state === "revoked" ? (
          <span
            title={`Revoked ${formatExact(apiKey.revoked_at)}`}
            className="shrink-0 rounded-full border border-line-strong px-[8px] py-[1px] text-micro leading-[16px] text-fg-faint"
          >
            revoked
          </span>
        ) : state === "expired" ? (
          <span
            title={`Expired ${formatExact(apiKey.expires_at)}`}
            className="shrink-0 rounded-full border border-red/40 bg-red/10 px-[8px] py-[1px] text-micro leading-[16px] text-red"
          >
            expired
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-green/40 bg-green/10 px-[8px] py-[1px] text-micro leading-[16px] text-green">
            active
          </span>
        )}

        <RowMeta className="hidden w-[130px] text-right md:block">
          {apiKey.last_used_at
            ? `used ${formatRelative(apiKey.last_used_at)}`
            : "never used"}
        </RowMeta>

        {active ? (
          <RowActions>
            <form action={revokeApiKeyAction}>
              <input type="hidden" name="key_id" value={apiKey.id} />
              <SubmitButton variant="tertiary" size="small" destructive>
                Revoke
              </SubmitButton>
            </form>
          </RowActions>
        ) : null}
      </RowControls>
    </ListRow>
  );
}
