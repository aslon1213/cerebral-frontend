/**
 * The Cerebral logo.
 *
 * Transcribed from the brand files, which are committed at `public/brand/` for
 * reference: `cerebral-mark.svg` and `cerebral-lockup.svg`. They are inlined
 * rather than loaded through `next/image` because both are drawn in
 * `currentColor` — an `<img>` would freeze the colour, and the whole point is
 * that the logo takes it from whatever it sits in.
 *
 * Both are `aria-hidden`, as the icons are: the accessible name belongs to the
 * link or heading wrapping them, so a screen reader announces "Cerebral" once
 * rather than reading the artwork and its container in turn.
 */

/** Aspect ratio of the lockup's viewBox, used to derive its width. */
const LOCKUP_RATIO = 168 / 32;

/** The glyph alone, for anywhere the name does not fit. */
export function CerebralMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 4c-6 0-7 4-7 8 0 3-4 3.5-6 4 2 .5 6 1 6 4 0 4 1 8 7 8" />
      <path d="M20 9c4 2 4 4 0 6" />
      <path d="M20 17c4 2 4 4 0 6" />
    </svg>
  );
}

/**
 * The glyph and the wordmark together.
 *
 * The width is derived from the height so the lockup keeps its proportions and
 * reserves the right amount of room before it paints — a logo in the header is
 * the last thing that should shift the layout under it.
 *
 * The wordmark is set in the brand file's own font stack, not the app's. It is
 * artwork, and the typeface it is drawn in is part of it.
 */
export function CerebralLockup({
  height = 24,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 168 32"
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      fill="none"
      className={className}
    >
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 4c-6 0-7 4-7 8 0 3-4 3.5-6 4 2 .5 6 1 6 4 0 4 1 8 7 8" />
        <path d="M20 9c4 2 4 4 0 6" />
        <path d="M20 17c4 2 4 4 0 6" />
      </g>
      <text
        x="42"
        y="22"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="20"
        fontWeight="500"
        letterSpacing="-0.4"
      >
        cerebral
      </text>
    </svg>
  );
}
