"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Table2,
  CalendarDays,
  GitBranchPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/table", label: "Table", icon: Table2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/timeline", label: "Timeline", icon: GitBranchPlus },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            <Icon
              size={17}
              className={cn(
                "transition-colors",
                active ? "text-accent" : "text-faint group-hover:text-muted"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
