import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/api/server";

import {
  IssuesIcon,
  LabelIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  SignOutIcon,
} from "./icons";
import { CerebralLockup, CerebralMark } from "./logo";
import { NavLink } from "./nav-link";
import { SubmitButton } from "./form-ui";
import { buttonClasses } from "./ui";

const LINKS = [
  { href: "/projects", label: "Projects", icon: <LayersIcon /> },
  { href: "/tasks", label: "Tasks", icon: <IssuesIcon /> },
  { href: "/labels", label: "Labels", icon: <LabelIcon /> },
];

/**
 * The workspace sidebar, following the library's "Navigation Sidebar" section:
 * a 220px column on its own darker fill, a workspace row at the top, the create
 * and search controls beneath it, then the menu, with the account pinned to the
 * bottom.
 */
export async function Nav() {
  const user = await getCurrentUser();
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    /*
      Below `md` the column keeps its structure but sheds its words: a 56px rail
      of icons. A 220px sidebar was taking two fifths of a phone screen away
      from the list it exists to navigate to, and every label in it duplicates
      the heading of the page it leads to.
    */
    <aside className="flex w-[56px] shrink-0 flex-col gap-[16px] border-r border-line bg-sidebar px-[8px] py-[14px] md:w-[220px] md:px-[12px]">
      {/*
        The workspace row wears the brand logo. On the collapsed rail there is
        only room for the glyph, so the lockup gives way to the mark rather than
        being squeezed — the same swap the rail makes with every other label.
      */}
      <Link
        href="/projects"
        aria-label="Cerebral"
        className="flex min-w-0 items-center justify-center rounded-control px-[4px] py-[3px] text-fg no-underline transition-colors duration-100 hover:bg-overlay-hover md:justify-start"
      >
        <CerebralMark size={22} className="shrink-0 md:hidden" />
        <CerebralLockup height={22} className="hidden shrink-0 md:block" />
      </Link>

      {/* Create + search, the pair the library places under the workspace row.
          Both used to point at `/tasks` and do nothing on arrival; they now
          carry the state that makes them mean what they say. */}
      <div className="flex flex-col items-stretch gap-[8px] md:flex-row md:items-center">
        <Link
          href="/tasks?new=1"
          aria-label="New task"
          title="New task"
          className={buttonClasses({
            variant: "secondary",
            size: "small",
            className: "justify-center !px-0 md:flex-1 md:justify-start md:!px-[14px]",
          })}
        >
          <PlusIcon size={12} />
          <span className="hidden md:inline">New task</span>
        </Link>
        <Link
          href="/tasks?focus=search"
          aria-label="Search tasks"
          title="Search tasks"
          className="inline-flex h-[28px] shrink-0 items-center justify-center rounded-control border border-line-strong bg-control text-fg-muted shadow-control transition-colors duration-100 hover:bg-control-hover hover:text-fg active:translate-y-[0.5px] md:size-[28px]"
        >
          <SearchIcon size={13} />
        </Link>
      </div>

      <nav className="flex flex-col gap-[1px]">
        {LINKS.map((link) => (
          <NavLink key={link.href} href={link.href} icon={link.icon}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* `mt-auto` pins the account block to the bottom of the column. */}
      <div className="mt-auto flex flex-col gap-[6px] border-t border-line pt-[12px]">
        {user ? (
          <div
            title={user.name}
            className="flex min-w-0 items-center justify-center gap-[8px] px-[4px] py-[2px] md:justify-start"
          >
            <span
              aria-hidden="true"
              className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-control text-micro font-medium text-fg-muted"
            >
              {initial}
            </span>
            <span className="hidden truncate text-small text-fg-muted md:inline">
              {user.name}
            </span>
          </div>
        ) : null}
        <form action={logoutAction}>
          <SubmitButton
            variant="tertiary"
            size="small"
            className="w-full justify-center !px-0 md:justify-start md:!px-[7px]"
          >
            <span className="hidden md:inline">Sign out</span>
            <span className="md:hidden" aria-hidden="true">
              <SignOutIcon />
            </span>
            <span className="sr-only md:hidden">Sign out</span>
          </SubmitButton>
        </form>
      </div>
    </aside>
  );
}
