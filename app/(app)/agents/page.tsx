import { AgentForm } from "@/app/_components/agent-form";
import { DeleteAgent } from "@/app/_components/agent-row-actions";
import { SubmitButton } from "@/app/_components/form-ui";
import { AgentIcon, KeyIcon, PlusIcon } from "@/app/_components/icons";
import {
  List,
  ListRow,
  RowActions,
  RowControls,
  RowMeta,
  RowTitle,
} from "@/app/_components/list";
import {
  Card,
  Container,
  Disclosure,
  EmptyState,
  PageHeader,
  TextLink,
} from "@/app/_components/ui";
import {
  createAgentAction,
  setAgentActiveAction,
  updateAgentAction,
} from "@/app/actions/agents";
import { api } from "@/lib/api/server";
import { formatRelative } from "@/lib/format";

export const metadata = { title: "Agents" };

/**
 * The agents that execute runs.
 *
 * An agent here is a record, not a process: creating one does not start
 * anything. What connects it to a real bot is an API key issued against it,
 * which is what makes a run attributable to this agent rather than that one.
 */
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: isNew } = await searchParams;
  const page = await api.agents.list({ limit: 200, sort_by: "name", order: "asc" });

  return (
    <>
      <PageHeader
        title="Agents"
        icon={<AgentIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "agent" : "agents"}
          </span>
        }
      />

      <Container className="flex flex-col gap-[16px] py-[20px]">
        <Disclosure summary="New agent" icon={<PlusIcon size={12} />} open={isNew === "1"}>
          <Card className="p-[16px]">
            <AgentForm action={createAgentAction} submitLabel="Add agent" />
          </Card>
        </Disclosure>

        {page.items.length === 0 ? (
          <EmptyState
            icon={<AgentIcon size={15} />}
            title="No agents yet"
            action={
              <TextLink href="/agents?new=1" className="text-small text-brand-ring">
                Add the first one
              </TextLink>
            }
          >
            An agent is the identity a run is attributed to. Add one, then issue it
            an API key so its observer bot can record what it does.
          </EmptyState>
        ) : (
          <List>
            {page.items.map((agent) => (
              <ListRow key={agent.id}>
                <AgentIcon
                  size={15}
                  className={agent.is_active ? "text-fg-subtle" : "text-fg-faint"}
                />

                <RowTitle
                  href={`/runs?agent_id=${agent.id}`}
                  className={agent.is_active ? undefined : "text-fg-subtle"}
                >
                  {agent.name}
                </RowTitle>

                <RowControls>
                  {agent.description ? (
                    <span className="hidden max-w-[300px] truncate text-mini leading-[16px] text-fg-faint lg:block">
                      {agent.description}
                    </span>
                  ) : null}

                  {agent.default_model ? (
                    <span className="hidden shrink-0 rounded-full border border-line-strong px-[8px] py-[1px] text-micro leading-[16px] text-fg-subtle sm:block">
                      {agent.default_model}
                    </span>
                  ) : null}

                  {/*
                    Deactivating is the real retirement path: once a run has been
                    executed by an agent the API refuses to delete it, and it is
                    right to — the run points at it.
                  */}
                  <form action={setAgentActiveAction} className="relative z-[1] flex shrink-0">
                    <input type="hidden" name="agent_id" value={agent.id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={agent.is_active ? "false" : "true"}
                    />
                    <SubmitButton variant="tertiary" size="small">
                      {agent.is_active ? "Active" : "Inactive"}
                    </SubmitButton>
                  </form>

                  <RowMeta className="hidden w-[90px] text-right md:block">
                    {formatRelative(agent.updated_at)}
                  </RowMeta>

                  <RowActions>
                    <TextLink
                      href={`/api-keys?agent_id=${agent.id}`}
                      title={`Issue a key for ${agent.name}`}
                      className="inline-flex items-center text-fg-subtle hover:text-fg"
                    >
                      <KeyIcon size={13} />
                      <span className="sr-only">Issue a key for {agent.name}</span>
                    </TextLink>
                  </RowActions>
                </RowControls>
              </ListRow>
            ))}
          </List>
        )}

        {page.items.length > 0 ? (
          <section className="flex flex-col gap-[10px]">
            <h2 className="text-small font-medium text-fg-subtle">Edit</h2>
            <div className="flex flex-col gap-[10px]">
              {page.items.map((agent) => (
                <Disclosure key={agent.id} summary={agent.name}>
                  <Card className="flex flex-col gap-[14px] p-[16px]">
                    <AgentForm action={updateAgentAction} agent={agent} submitLabel="Save" />
                    <DeleteAgent agentId={agent.id} agentName={agent.name} />
                  </Card>
                </Disclosure>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}
