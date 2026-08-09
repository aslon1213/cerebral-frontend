import { PlusIcon, RepoIcon } from "@/app/_components/icons";
import { List, ListRow, RowControls, RowMeta, RowTitle } from "@/app/_components/list";
import { RepoForm } from "@/app/_components/repo-form";
import {
  Card,
  Container,
  Disclosure,
  EmptyState,
  PageHeader,
  TextLink,
} from "@/app/_components/ui";
import { connectRepoAction } from "@/app/actions/repos";
import { api } from "@/lib/api/server";
import { formatRelative } from "@/lib/format";

export const metadata = { title: "Repos" };

/**
 * The repos runs are recorded against, and the way in to each one's history.
 *
 * The history is the reason this page exists — a repo row is a door, not a
 * record worth reading on its own.
 */
export default async function ReposPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: isNew } = await searchParams;
  const page = await api.repos.list({ limit: 200, sort_by: "name", order: "asc" });

  return (
    <>
      <PageHeader
        title="Repos"
        icon={<RepoIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "repo" : "repos"}
          </span>
        }
      />

      <Container className="flex flex-col gap-[16px] py-[20px]">
        <Disclosure summary="Connect a repo" icon={<PlusIcon size={12} />} open={isNew === "1"}>
          <Card className="p-[16px]">
            <RepoForm action={connectRepoAction} submitLabel="Connect" />
          </Card>
        </Disclosure>

        {page.items.length === 0 ? (
          <EmptyState
            icon={<RepoIcon size={15} />}
            title="No repos connected"
            action={
              <TextLink href="/repos?new=1" className="text-small text-brand-ring">
                Connect the first one
              </TextLink>
            }
          >
            A repo has to be connected before an agent can record code changes
            against it. Observer bots do this themselves at startup.
          </EmptyState>
        ) : (
          <List>
            {page.items.map((repo) => (
              <ListRow key={repo.id}>
                <RepoIcon size={15} className="text-fg-subtle" />
                <RowTitle href={`/repos/${repo.id}`}>{repo.name}</RowTitle>
                <RowControls>
                  <span className="hidden max-w-[280px] truncate font-mono text-mini leading-[16px] text-fg-faint md:block">
                    {repo.local_path}
                  </span>
                  <span className="hidden shrink-0 rounded-full border border-line-strong px-[8px] py-[1px] text-micro leading-[16px] text-fg-subtle sm:block">
                    {repo.default_branch}
                  </span>
                  <RowMeta className="w-[90px] text-right">
                    {formatRelative(repo.updated_at)}
                  </RowMeta>
                </RowControls>
              </ListRow>
            ))}
          </List>
        )}
      </Container>
    </>
  );
}
