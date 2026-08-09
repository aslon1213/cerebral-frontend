"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "./ui";

/**
 * A sidebar menu item, in the three states the library defines for them:
 * default, hover and selected.
 *
 * Geometry is straight from the "Menu Buttons" component — 4px radius, 7px of
 * leading padding, a 10px gap to the 16px icon, and 13px medium type. Hover and
 * selected share one fill, `ui/button-background` at 20%.
 */
export function NavLink({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  /** A count worth interrupting for. Omitted or 0 renders nothing. */
  badge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Detail routes keep their section highlighted, so `/tasks/abc` still lights
  // up "Tasks".
  const selected = pathname === href || pathname.startsWith(`${href}/`);
  const count = badge && badge > 0 ? badge : null;

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      // The label is the accessible name on wide screens; in the collapsed rail
      // it is gone from the page, so the title carries it instead.
      title={
        typeof children === "string"
          ? count
            ? `${children} — ${count} waiting on you`
            : children
          : undefined
      }
      className={cx(
        "relative flex items-center gap-[10px] rounded-control py-[5.5px]",
        "justify-center px-[7px] md:justify-start md:pl-[7px] md:pr-[6px]",
        "text-small font-medium no-underline transition-colors duration-100",
        "hover:bg-overlay-hover hover:text-fg",
        selected ? "bg-overlay-hover text-fg" : "text-fg-muted",
      )}
    >
      {icon}
      <span className="hidden md:inline">{children}</span>

      {/*
        A blocked agent is costing time, so the count is the one thing in this
        column allowed to carry a fill. On the collapsed rail there is no room
        for the number beside the label, so it becomes a dot pinned to the icon
        — still impossible to miss, still announced by the title and the
        screen-reader text.
      */}
      {count ? (
        <>
          <span
            aria-hidden="true"
            className="absolute right-[6px] top-[3px] size-[7px] rounded-full bg-orange ring-2 ring-sidebar md:hidden"
          />
          <span
            aria-hidden="true"
            className="ml-auto hidden shrink-0 rounded-full bg-orange px-[6px] text-micro leading-[16px] font-semibold text-app md:inline"
          >
            {count > 99 ? "99+" : count}
          </span>
          <span className="sr-only">{count} waiting on you</span>
        </>
      ) : null}
    </Link>
  );
}
