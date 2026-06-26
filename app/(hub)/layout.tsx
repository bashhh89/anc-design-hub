import Link from "next/link";
import { Nav } from "@/components/nav";
import { SearchBox } from "@/components/search-box";
import { Avatar } from "@/components/pills";
import { NewProjectButton } from "@/components/new-project";
import { currentUser } from "@/lib/auth";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <div className="flex min-h-screen">
      {/* Rail */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-surface">
            <span className="font-display text-sm font-bold tracking-tight">A</span>
          </span>
          <span className="font-display text-[15px] font-semibold leading-tight tracking-tight">
            Design&nbsp;Hub
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
              ANC Sales-support
            </span>
          </span>
        </Link>

        <div className="mt-2 flex-1">
          <Nav />
        </div>

        {user && (
          <div className="flex items-center gap-2.5 border-t border-hairline px-4 py-3.5">
            <Avatar name={user.name} color={user.color} size={30} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs capitalize text-faint">
                {user.role.toLowerCase()}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-hairline bg-canvas/80 px-7 backdrop-blur">
          <SearchBox />
          <div className="ml-auto">
            <NewProjectButton />
          </div>
        </header>
        <main className="flex-1 px-7 py-7">{children}</main>
      </div>
    </div>
  );
}
