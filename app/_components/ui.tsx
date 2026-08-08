import Link from "next/link";

/**
 * Presentational primitives built to the Linear design system.
 *
 * Nothing here uses hooks, so these stay server components and only the bits
 * that genuinely need the client — see `form-ui.tsx` — cross that boundary.
 */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "large" | "medium" | "small";

/**
 * The library draws every button at radius 4 with a 14px inline padding; only
 * the block padding and the type scale change between sizes.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  large: "px-[14px] py-[13px] text-normal font-normal",
  medium: "px-[14px] py-[8px] text-small font-normal",
  small: "px-[14px] py-[6.5px] text-mini font-medium",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-solid border-brand-solid text-white shadow-button hover:bg-brand-hover",
  secondary:
    "bg-control border-line-strong text-fg shadow-control hover:bg-control-hover hover:border-line-input",
  tertiary:
    "bg-transparent border-transparent text-fg-muted hover:bg-overlay-hover hover:text-fg",
};

/** Destructive swaps the fill for `decoration/red` and keeps the rest. */
const DESTRUCTIVE_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-red border-red text-white shadow-button hover:bg-red-light",
  secondary:
    "bg-control border-line-strong text-red shadow-control hover:bg-control-hover hover:border-red",
  tertiary: "bg-transparent border-transparent text-red hover:bg-overlay-hover",
};

export function buttonClasses({
  variant = "primary",
  size = "medium",
  destructive = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  destructive?: boolean;
  className?: string;
} = {}) {
  return cx(
    "inline-flex items-center justify-center gap-[8px] rounded-control border whitespace-nowrap",
    "transition-colors duration-100 cursor-pointer",
    // A press should register even when the pointer never moves. The library's
    // buttons dip rather than scale, so the travel is 1px and nothing reflows.
    "active:translate-y-[0.5px]",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-inherit disabled:active:translate-y-0",
    SIZE_CLASSES[size],
    destructive ? DESTRUCTIVE_CLASSES[variant] : VARIANT_CLASSES[variant],
    className,
  );
}

interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  destructive?: boolean;
}

export function Button({
  variant,
  size,
  destructive,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClasses({ variant, size, destructive, className })}
    />
  );
}

/** A `next/link` wearing the button styling, for navigations. */
export function LinkButton({
  variant,
  size,
  destructive,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  destructive?: boolean;
}) {
  return (
    <Link
      {...props}
      className={buttonClasses({ variant, size, destructive, className })}
    />
  );
}

/** Square, icon-only button — the sidebar's search and close controls. */
export function IconButton({
  className,
  label,
  ...props
}: React.ComponentPropsWithRef<"button"> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-[28px] shrink-0 cursor-pointer items-center justify-center",
        "rounded-control border border-line-strong bg-control text-fg-muted shadow-control",
        "transition-colors duration-100 hover:bg-control-hover hover:text-fg",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Text links
// ---------------------------------------------------------------------------

export function TextLink({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      {...props}
      className={cx(
        "text-fg no-underline transition-colors duration-100 hover:text-brand-ring",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-panel border border-line bg-surface shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A titled block: small caps-ish heading above a card. */
export function Section({
  heading,
  action,
  children,
  className,
}: {
  heading?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("flex flex-col gap-[10px]", className)}>
      {heading || action ? (
        <div className="flex min-h-[24px] items-center justify-between gap-[12px]">
          {heading ? (
            <h2 className="text-small font-medium text-fg-subtle">{heading}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Caps the measure of a view's content.
 *
 * Without this a list row on a 27" display stretches past 1600px and the space
 * between a task's name and its metadata becomes a void you have to track
 * across. The header and toolbar rules stay full-bleed — only what sits inside
 * them is constrained — so the app still reads as a single column.
 */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-[1120px] px-[20px]", className)}>{children}</div>
  );
}

/**
 * The bar across the top of a view. The library keeps it 48px tall with a
 * single hairline underneath and no fill of its own.
 */
export function PageHeader({
  title,
  icon,
  breadcrumb,
  actions,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-app/85 backdrop-blur-md">
      <Container className="flex h-[48px] items-center justify-between gap-[12px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          {icon ? <span className="text-fg-subtle">{icon}</span> : null}
          {breadcrumb ? (
            <>
              {breadcrumb}
              <span className="text-small text-fg-faint">/</span>
            </>
          ) : null}
          <h1 className="truncate text-small font-medium text-fg">{title}</h1>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-[8px]">{actions}</div>
        ) : null}
      </Container>
    </header>
  );
}

/**
 * An empty view is an instruction, not an apology: it names what is missing and
 * puts the thing that fixes it within reach.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-[6px] rounded-panel border border-dashed border-line-strong bg-surface/40 px-[20px] py-[36px] text-center">
      {icon ? (
        <span className="mb-[2px] flex size-[32px] items-center justify-center rounded-panel bg-surface-hover text-fg-faint">
          {icon}
        </span>
      ) : null}
      <p className="text-small font-medium text-fg">{title}</p>
      {children ? (
        <p className="max-w-[380px] text-small text-fg-subtle">{children}</p>
      ) : null}
      {action ? <div className="mt-[8px]">{action}</div> : null}
    </div>
  );
}

/**
 * One line of the properties rail on a detail page: what it is on the left,
 * what it says on the right.
 *
 * These used to run together as a single wrapped strip of badges under the
 * title, where priority, dates and labels were only distinguishable by their
 * shapes. A rail gives each a name and a fixed place to look.
 */
export function Property({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cx(
        "flex justify-between gap-[12px] py-[5px]",
        align === "center" ? "items-center" : "items-start",
      )}
    >
      <span className="shrink-0 text-mini leading-[16px] text-fg-subtle">{label}</span>
      <span className="min-w-0 text-right text-small text-fg-muted">{children}</span>
    </div>
  );
}

/** The column of properties and summaries beside a detail view's content. */
export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-[20px] lg:sticky lg:top-[68px] lg:w-[264px] lg:self-start">
      {children}
    </aside>
  );
}

/** A titled block inside the rail, separated by a hairline rather than a card. */
export function RailSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-[6px] border-t border-line pt-[12px] first:border-t-0 first:pt-0">
      <h2 className="text-mini font-medium tracking-[0.02em] text-fg-faint uppercase">
        {heading}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Disclosure
// ---------------------------------------------------------------------------

/**
 * A composer that stays folded until it is wanted.
 *
 * Every list view used to open with its create form already expanded, which put
 * an empty form where the content belongs and pushed the actual list off the
 * bottom of the screen. Folding it away costs one click and gives the page back
 * to the thing you came to read.
 *
 * `<details>` rather than React state on purpose: it opens before hydration, it
 * is a real disclosure to a screen reader without any ARIA, and `open` can be
 * set from the server — which is how the sidebar's "New task" button lands on
 * `/tasks` with the composer already unfolded.
 */
export function Disclosure({
  summary,
  icon,
  open,
  children,
  className,
}: {
  summary: React.ReactNode;
  icon?: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details open={open} className={cx("group", className)}>
      <summary
        className={buttonClasses({
          variant: "secondary",
          size: "medium",
          // `w-fit` keeps the trigger the width of its label; a bare <summary>
          // is a block and would otherwise stretch across the column.
          className: "w-fit select-none",
        })}
      >
        {icon}
        {summary}
        <ChevronIcon className="text-fg-subtle transition-transform duration-150 group-open:rotate-180" />
      </summary>
      {/* The margin lives here, not on the summary, so nothing is left behind
          when the panel is closed. */}
      <div className="mt-[10px]">{children}</div>
    </details>
  );
}

/** The 10×6 chevron the library draws on selects and disclosures. */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 6"
      fill="none"
      className={cx("size-[10px] shrink-0", className)}
    >
      <path
        d="M1 1L5 5L9 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export function Banner({
  tone = "critical",
  heading,
  children,
}: {
  tone?: "critical" | "info";
  heading?: string;
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "critical"
      ? "border-red/40 bg-red/10 text-red"
      : "border-brand/40 bg-brand/10 text-brand-ring";

  return (
    <div
      role="alert"
      className={cx("rounded-input border px-[13px] py-[10px] text-small", toneClasses)}
    >
      {heading ? <p className="font-medium">{heading}</p> : null}
      <p className={cx(heading && "mt-[2px]", "leading-[18px]")}>{children}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

/**
 * Shared field chrome: `grey/151621` fill inside a `grey/444556` hairline at
 * radius 6, with 13px of padding — the "Input Fields" component in the library.
 */
/*
  No width is set here on purpose. Inside a `Field` the control stretches on its
  own — the field is a flex column — while a toolbar can hand it an explicit
  width. Baking in `w-full` would beat that width, since Tailwind resolves
  conflicting utilities by stylesheet order rather than by class order.
*/
const CONTROL_BASE =
  "rounded-input border bg-surface-sunken text-fg " +
  "placeholder:text-fg-faint transition-colors duration-100 " +
  "hover:border-line-hover disabled:cursor-not-allowed disabled:opacity-60";

/** `compact` is the toolbar form — same skin, tightened for a filter bar. */
export type ControlDensity = "comfortable" | "compact";

const DENSITY_CLASSES: Record<ControlDensity, string> = {
  comfortable: "px-[13px] py-[12px] text-normal",
  compact: "px-[9px] py-[6px] text-small leading-[18px]",
};

function controlClasses(
  invalid?: boolean,
  density: ControlDensity = "comfortable",
  className?: string,
) {
  return cx(
    CONTROL_BASE,
    DENSITY_CLASSES[density],
    invalid ? "border-red" : "border-line-input",
    className,
  );
}

/** Label + control + error message, stacked with the library's 4px gap. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex w-full flex-col gap-[4px]", className)}>
      <label
        htmlFor={htmlFor}
        className="pl-[2px] text-small leading-[16px] text-fg-muted"
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="pl-[2px] text-mini leading-[16px] text-fg-faint">{hint}</p>
      ) : null}
      {error ? (
        <p className="pl-[2px] text-mini leading-[16px] text-red">{error}</p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  density,
  className,
  ...props
}: React.ComponentPropsWithRef<"input"> & {
  invalid?: boolean;
  density?: ControlDensity;
}) {
  return <input {...props} className={controlClasses(invalid, density, className)} />;
}

export function Textarea({
  invalid,
  density,
  className,
  ...props
}: React.ComponentPropsWithRef<"textarea"> & {
  invalid?: boolean;
  density?: ControlDensity;
}) {
  return (
    <textarea
      {...props}
      className={controlClasses(
        invalid,
        density,
        cx("resize-y leading-[22px]", className),
      )}
    />
  );
}

export function Select({
  invalid,
  density = "comfortable",
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<"select"> & {
  invalid?: boolean;
  density?: ControlDensity;
}) {
  return (
    <select
      {...props}
      className={controlClasses(
        invalid,
        density,
        // `appearance-none` drops the platform arrow so the control keeps the
        // same skin as every other field; the chevron is drawn as a background
        // image in its place.
        cx(
          "cursor-pointer appearance-none bg-[length:10px] bg-no-repeat",
          density === "compact"
            ? "bg-[position:right_9px_center] pr-[26px]"
            : "bg-[position:right_13px_center] pr-[32px]",
          className,
        ),
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23858699' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: React.ComponentPropsWithRef<"input"> & { label: React.ReactNode }) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-[8px] rounded-control px-[6px] py-[4px]",
        "text-small text-fg-muted transition-colors duration-100 hover:bg-overlay-hover hover:text-fg",
        className,
      )}
    >
      <input
        {...props}
        type="checkbox"
        className="size-[14px] cursor-pointer accent-brand-solid"
      />
      {label}
    </label>
  );
}
