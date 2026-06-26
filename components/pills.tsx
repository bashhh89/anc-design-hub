import type { Status, Priority, ProjectType } from "@prisma/client";
import { STATUS_META, PRIORITY_META, TYPE_META } from "@/lib/design";
import { initials } from "@/lib/utils";

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: m.tint, color: m.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-[2px] rotate-45" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function TypeChip({ type }: { type: ProjectType }) {
  const m = TYPE_META[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
      style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 10%, transparent)` }}
    >
      {m.label}
    </span>
  );
}

export function Avatar({
  name,
  color,
  size = 24,
}: {
  name: string;
  color?: string | null;
  size?: number;
}) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        background: color || "#5a4be0",
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </span>
  );
}
