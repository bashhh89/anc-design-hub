"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, ShieldCheck } from "lucide-react";
import { Avatar } from "./pills";
import { setViewAs } from "@/lib/actions";

type U = { id: string; name: string; role: string; color: string };

export function UserSwitcher({ users, currentId }: { users: U[]; currentId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const current = users.find((u) => u.id === currentId) ?? users[0];

  return (
    <div className="border-t border-hairline px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
        Viewing as
      </div>
      <label className="relative flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-surface-2">
        {current && <Avatar name={current.name} color={current.color} size={30} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{current?.name}</div>
          <div className="flex items-center gap-1 text-xs text-faint">
            {current?.role === "ADMIN" && <ShieldCheck size={11} className="text-accent" />}
            <span className="capitalize">{current?.role.toLowerCase()}</span>
          </div>
        </div>
        <ChevronsUpDown size={15} className="text-faint" />
        <select
          aria-label="Switch user"
          disabled={pending}
          value={currentId}
          onChange={(e) =>
            start(async () => {
              await setViewAs(e.target.value);
              router.refresh();
            })
          }
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.role.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
