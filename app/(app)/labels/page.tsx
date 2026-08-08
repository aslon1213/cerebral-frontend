import { LabelDot } from "@/app/_components/badges";
import { FilterForm, SubmitButton } from "@/app/_components/form-ui";
import { LabelIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/_components/icons";
import { List, Toolbar } from "@/app/_components/list";
import { LabelForm } from "@/app/_components/label-form";
import {
  Card,
  ChevronIcon,
  Container,
  Disclosure,
  EmptyState,
  Input,
  PageHeader,
  TextLink,
} from "@/app/_components/ui";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "@/app/actions/labels";
import { api } from "@/lib/api/server";
import type { LabelResponse, LabelSort } from "@/lib/api/types";

export const metadata = { title: "Labels" };

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort_by?: string; new?: string }>;
}) {
  const filters = await searchParams;

  const page = await api.labels.list({
    q: filters.q || undefined,
    sort_by: (filters.sort_by as LabelSort) || "name",
    order: "asc",
    limit: 200,
  });

  const hasFilters = Boolean(filters.q);

  return (
    <>
      <PageHeader
        title="Labels"
        icon={<LabelIcon />}
        actions={
          <span className="text-mini text-fg-subtle tabular-nums">
            {page.total} {page.total === 1 ? "label" : "labels"}
          </span>
        }
      />

      <Toolbar>
        <FilterForm className="flex flex-1 flex-wrap items-center gap-[8px]">
          <span className="relative flex items-center">
            <SearchIcon
              size={13}
              className="pointer-events-none absolute left-[9px] text-fg-faint"
            />
            <Input
              name="q"
              density="compact"
              defaultValue={filters.q ?? ""}
              placeholder="Search labels…"
              aria-label="Search labels"
              className="w-[220px] pl-[28px]"
            />
          </span>
          {hasFilters ? (
            <TextLink
              href="/labels"
              className="px-[4px] text-mini text-fg-subtle hover:text-fg"
            >
              Clear
            </TextLink>
          ) : null}
        </FilterForm>
      </Toolbar>

      <Container className="flex flex-col gap-[16px] py-[20px]">
        <Disclosure
          summary="New label"
          icon={<PlusIcon size={12} />}
          open={filters.new === "1"}
        >
          <Card className="p-[16px]">
            <LabelForm action={createLabelAction} submitLabel="Create label" />
          </Card>
        </Disclosure>

        {page.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchIcon size={15} />}
              title="No labels match that search"
              action={
                <TextLink href="/labels" className="text-small text-brand-ring">
                  Clear search
                </TextLink>
              }
            />
          ) : (
            <EmptyState
              icon={<LabelIcon size={15} />}
              title="No labels yet"
              action={
                <TextLink href="/labels?new=1" className="text-small text-brand-ring">
                  Create the first one
                </TextLink>
              }
            >
              Labels cut across projects — anything tagged `bug` shows up together,
              wherever it lives.
            </EmptyState>
          )
        ) : (
          <List>
            {page.items.map((label) => (
              <LabelRow key={label.id} label={label} />
            ))}
          </List>
        )}
      </Container>
    </>
  );
}

/**
 * One label as a row that opens for editing.
 *
 * Every label used to render its edit form open, so a workspace with seven of
 * them met you with seven headings, fourteen inputs and seven Save buttons —
 * for a screen whose usual purpose is to read the list. The form is the same
 * one; it just waits to be asked for.
 */
function LabelRow({ label }: { label: LabelResponse }) {
  return (
    <details className="group border-b border-line last:border-b-0 open:bg-surface-hover/40">
      {/*
        Nothing interactive may live in here: a button inside a <summary> still
        toggles the disclosure when pressed, so a delete control placed on the
        row would fire and open the panel at once. Delete sits in the panel
        below instead — which also puts a destructive action a deliberate step
        away rather than one hover away.
      */}
      <summary className="flex items-center gap-[10px] px-[16px] py-[9px] transition-colors duration-100 hover:bg-surface-hover">
        <ChevronIcon className="shrink-0 text-fg-faint transition-transform duration-150 group-open:rotate-180" />
        <LabelDot id={label.id} />
        <span className="shrink-0 text-normal text-fg">{label.name}</span>

        {label.description ? (
          <span className="min-w-0 truncate text-small text-fg-subtle">
            {label.description}
          </span>
        ) : (
          <span className="truncate text-small text-fg-faint">No description</span>
        )}
      </summary>

      <div className="flex flex-col gap-[12px] border-t border-line bg-surface-sunken/40 px-[16px] py-[14px]">
        <LabelForm action={updateLabelAction} label={label} submitLabel="Save" />

        <div className="flex justify-end">
          <form action={deleteLabelAction}>
            <input type="hidden" name="label_id" value={label.id} />
            <SubmitButton variant="tertiary" size="small" destructive>
              <TrashIcon size={13} />
              Delete label
            </SubmitButton>
          </form>
        </div>
      </div>
    </details>
  );
}
