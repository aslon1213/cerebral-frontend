"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { StatusIcon } from "./badges";
import type { TaskStatus } from "@/lib/api/types";

import {
  Banner,
  Button,
  type ButtonSize,
  type ButtonVariant,
  ChevronIcon,
  cx,
} from "./ui";

/** The interactive slice of the design system — the parts that need hooks. */

export function SubmitButton({
  children,
  variant = "primary",
  size = "medium",
  destructive,
  className,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  destructive?: boolean;
  className?: string;
}) {
  // `useFormStatus` reads the enclosing form, so the button reflects pending
  // state without the page threading it down.
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      destructive={destructive}
      disabled={pending}
      className={className}
    >
      {/*
        The label stays in the flow while pending so the button keeps its width;
        the spinner sits beside it.
      */}
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}

/** A borrowed-from-`loader` ring, sized to sit inline with 12–15px type. */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-[12px] shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70"
    />
  );
}

const STATUS_TEXT: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

/**
 * The status control on a list row.
 *
 * A bordered `<select>` on every row put twenty-six boxes down the right edge of
 * the task list, each one heavier than the task name beside it, and each one
 * repeating the status its own group header had already stated. This shows the
 * status as the glyph and word it is, and only takes on a control's chrome —
 * fill, chevron — when the row is hovered or something in it has focus.
 *
 * The native `<select>` is still there, stretched invisibly over the whole
 * control, so the picker, the keyboard, and the form submission all behave
 * exactly as the browser intends. Only the painted surface is ours.
 */
export function StatusSelect({
  name,
  value,
  options,
  label,
  /**
   * Off inside a status-grouped list, where the heading above the run of rows
   * has already named the status and every row would only repeat it. The glyph
   * still carries the value, and the accessible name still spells it out.
   */
  showLabel = true,
}: {
  name: string;
  value: TaskStatus;
  options: readonly TaskStatus[];
  label: string;
  showLabel?: boolean;
}) {
  const ref = useRef<HTMLSelectElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onChange = () => element.form?.requestSubmit();
    element.addEventListener("change", onChange);
    return () => element.removeEventListener("change", onChange);
  }, []);

  return (
    <span
      className={cx(
        // `status-control` is the hook for the focus ring; see globals.css.
        "status-control relative inline-flex shrink-0 items-center gap-[6px] rounded-control py-[3px]",
        "text-small text-fg-muted transition-colors duration-100",
        // Only a direct hover fills the control. Hovering anywhere on the row
        // just reveals the chevron below, which is enough to say it is one.
        "hover:bg-overlay-hover",
        // Glyph-only still needs a comfortable target, so the box keeps its
        // width rather than shrinking to the 14px ring.
        showLabel ? "w-[124px] px-[6px]" : "w-[38px] justify-center px-[4px]",
        pending && "opacity-60",
      )}
    >
      <StatusIcon status={value} />
      {showLabel ? <span className="truncate">{STATUS_TEXT[value]}</span> : null}
      <ChevronIcon
        className={cx(
          "text-fg-faint opacity-0 transition-opacity duration-100",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          showLabel && "ml-auto",
        )}
      />

      <select
        ref={ref}
        name={name}
        aria-label={label}
        defaultValue={value}
        disabled={pending}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {STATUS_TEXT[option]}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * Wraps a filter form so changing any control applies it immediately.
 *
 * The "Filter" button it replaces made every refinement a two-step act — pick,
 * then confirm — for a form whose result is already visible on the page. Typing
 * in the search box still waits for Enter, since submitting per keystroke would
 * reload the list mid-word.
 */
export function FilterForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const onChange = (event: Event) => {
      if ((event.target as HTMLElement)?.tagName === "SELECT") form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return (
    <form ref={ref} className={className}>
      {children}
      {/*
        Without JavaScript nothing above submits the form, so a real button has
        to exist. It is only ever reached by keyboard in that case, so it is
        hidden the way a skip link is: present, but out of the layout until
        focused.
      */}
      <button type="submit" className="sr-only focus:not-sr-only">
        Apply filters
      </button>
    </form>
  );
}

/** Error summary for a form. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Banner tone="critical" heading="Something went wrong">
      {message}
    </Banner>
  );
}
