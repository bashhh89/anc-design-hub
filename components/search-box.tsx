"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative w-full max-w-sm"
    >
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search projects, briefs, clients…"
        className="h-9 w-full rounded-xl border border-hairline bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
      />
    </form>
  );
}
