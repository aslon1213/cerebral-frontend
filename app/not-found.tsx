import { LinkButton } from "@/app/_components/ui";

/**
 * Reached both by an unmatched URL and by `notFound()` from a detail page whose
 * record the API does not have — a project or task that was deleted in another
 * tab, most often.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-[20px] py-[48px]">
      <div className="flex max-w-[420px] flex-col items-center gap-[10px] text-center">
        <span className="mb-[2px] flex size-[36px] items-center justify-center rounded-panel border border-line-strong bg-surface text-title3 font-medium text-fg-faint tabular-nums">
          404
        </span>

        <p className="text-large font-medium text-fg">There is nothing at this address</p>
        <p className="text-small text-fg-subtle">
          The project or task you are after has been deleted, or the link was never
          right to begin with.
        </p>

        <LinkButton href="/projects" variant="secondary" className="mt-[8px]">
          Back to projects
        </LinkButton>
      </div>
    </div>
  );
}
