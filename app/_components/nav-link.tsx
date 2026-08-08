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
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Detail routes keep their section highlighted, so `/tasks/abc` still lights
  // up "Tasks".
  const selected = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      // The label is the accessible name on wide screens; in the collapsed rail
      // it is gone from the page, so the title carries it instead.
      title={typeof children === "string" ? children : undefined}
      className={cx(
        "flex items-center gap-[10px] rounded-control py-[5.5px]",
        "justify-center px-[7px] md:justify-start md:pl-[7px] md:pr-[2px]",
        "text-small font-medium no-underline transition-colors duration-100",
        "hover:bg-overlay-hover hover:text-fg",
        selected ? "bg-overlay-hover text-fg" : "text-fg-muted",
      )}
    >
      {icon}
      <span className="hidden md:inline">{children}</span>
    </Link>
  );
}
