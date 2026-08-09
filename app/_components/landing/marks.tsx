import Link from "next/link";

import { CerebralLockup } from "@/app/_components/logo";

/**
 * The three marks beside the three claims, and the wordmark in the header and
 * footer.
 *
 * Each mark is drawn from the thing it labels rather than chosen from an icon
 * set: a pointer resting on a line of code, a scrubber part-way through a
 * history, a commit graph. They are monochrome and 20px — the page has one
 * loud element and this is not it.
 */

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[20px]"
    >
      {children}
    </svg>
  );
}

/** A pointer resting on the middle of three lines of code. */
export function PointerMark() {
  return (
    <Mark>
      <path d="M2.5 5h12M2.5 9.5h6M2.5 14h8.5" />
      <path
        d="M11.2 8.6 16.8 11.3 14.2 12 13.2 14.5Z"
        fill="currentColor"
        stroke="none"
      />
    </Mark>
  );
}

/** Replay: a loop back to the beginning, with a play head inside it. */
export function ScrubMark() {
  return (
    <Mark>
      <path d="M16.8 10a6.8 6.8 0 1 1-2-4.8" />
      <path d="M17 2.6v3.4h-3.4" />
      <path d="M8.6 7.9 12 10l-3.4 2.1Z" fill="currentColor" stroke="none" />
    </Mark>
  );
}

/** A commit graph: a spine, and one branch rejoining it. */
export function GraphMark() {
  return (
    <Mark>
      <path d="M6 3.5v13" />
      <path d="M6 8.5c0 3 1.5 4 4.5 4H12" />
      <circle cx="6" cy="5.5" r="1.9" />
      <circle cx="6" cy="16.5" r="1.9" />
      <circle cx="14.2" cy="12.5" r="1.9" />
    </Mark>
  );
}

/**
 * The lockup, at marketing scale. The sidebar wears the same one, so the page
 * and the product it leads into are recognisably the same thing.
 *
 * The link carries the name; the artwork inside it is `aria-hidden`.
 */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Cerebral"
      className="inline-flex items-center rounded-control text-fg no-underline transition-colors duration-100 hover:text-brand-ring"
    >
      <CerebralLockup height={24} />
    </Link>
  );
}
