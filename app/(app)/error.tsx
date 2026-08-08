"use client";

import { useEffect } from "react";

import { Button } from "@/app/_components/ui";

/**
 * The fallback when a view throws — a failed API call, most often.
 *
 * The copy names what happened and what to do about it, and does not apologise:
 * an error message is direction, not mood.
 *
 * Note for anyone porting patterns from older Next.js: the retry callback is
 * `unstable_retry` in 16, not `reset`.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-[20px] py-[48px]">
      <div className="flex max-w-[420px] flex-col items-center gap-[10px] text-center">
        <span className="mb-[2px] flex size-[32px] items-center justify-center rounded-panel border border-red/40 bg-red/10 text-red">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[15px]">
            <path
              d="M8 4.5v4M8 11.2v.3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        </span>

        <p className="text-large font-medium text-fg">This view could not be loaded</p>
        <p className="text-small text-fg-subtle">
          The request to the Cerebral API did not come back. Try again — if it keeps
          failing, the API is probably down.
        </p>

        {/* The digest is the only thread back to the server-side stack trace,
            so it is shown rather than swallowed. */}
        {error.digest ? (
          <p className="text-mini text-fg-faint">Reference {error.digest}</p>
        ) : null}

        <Button variant="secondary" onClick={() => unstable_retry()} className="mt-[8px]">
          Try again
        </Button>
      </div>
    </div>
  );
}
