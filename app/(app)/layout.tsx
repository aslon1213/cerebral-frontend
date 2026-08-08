import { Nav } from "@/app/_components/nav";

/**
 * Layout for the signed-in area. Kept in a route group so `/login` and
 * `/register` don't inherit the sidebar.
 *
 * The shell is the two-column frame the library uses: a fixed sidebar beside a
 * column that scrolls on its own, so the sidebar — and each view's sticky
 * header — stay put while the content moves.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Nav />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
