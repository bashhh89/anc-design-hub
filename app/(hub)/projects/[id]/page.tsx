import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Link2,
  Mail,
  FolderOpen,
  CalendarClock,
  FileText,
  ExternalLink,
  Lock,
} from "lucide-react";
import { getProject } from "@/lib/queries";
import { currentUser, isAdmin } from "@/lib/auth";
import { StatusPill, PriorityPill, TypeChip, Avatar } from "@/components/pills";
import { CATEGORY_META, TYPE_META } from "@/lib/design";
import {
  StatusSelect,
  AddComment,
  AddRevision,
  AddAttachment,
  ArchiveButton,
} from "@/components/project-interactions";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const [p, me] = await Promise.all([getProject(params.id), currentUser()]);
  if (!p) notFound();
  const canDelete = isAdmin(me);

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <Link href="/board" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Back to board
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-6 shadow-card">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: TYPE_META[p.type].color }} />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <TypeChip type={p.type} />
              <span className="text-xs text-faint">·</span>
              <span className="text-xs font-medium text-muted">{CATEGORY_META[p.category].label}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">{p.name}</h1>
            {p.crmOpportunityName && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
                <Link2 size={13} /> {p.crmOpportunityName}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusSelect id={p.id} status={p.status} />
            <PriorityPill priority={p.priority} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline pt-4 text-sm">
          {p.teamLead && (
            <span className="flex items-center gap-2">
              <Avatar name={p.teamLead.name} color={p.teamLead.color} size={22} />
              <span className="text-muted">Lead</span>
              <span className="font-medium">{p.teamLead.name}</span>
            </span>
          )}
          {p.dueDate && (
            <span className="flex items-center gap-1.5 text-muted">
              <CalendarClock size={15} className="text-faint" />
              Due <span className="font-medium text-ink">{format(new Date(p.dueDate), "MMM d, yyyy")}</span>
            </span>
          )}
          {canDelete ? (
            <span className="ml-auto"><ArchiveButton id={p.id} /></span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-faint">
              <Lock size={12} /> Admins only
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Brief */}
          {p.brief ? (
            <Section title="The brief" badge="From Sales">
              <Field label="Deliverables">{p.brief.deliverables}</Field>
              {p.brief.references && <Field label="References">{p.brief.references}</Field>}
              <div className="mt-3 flex flex-wrap gap-2">
                {p.brief.deadline && (
                  <Tag icon={CalendarClock}>Deadline {format(new Date(p.brief.deadline), "MMM d")}</Tag>
                )}
                {p.brief.emailLink && <LinkTag icon={Mail} href={p.brief.emailLink}>Email thread</LinkTag>}
                {p.brief.teamsLink && <LinkTag icon={FolderOpen} href={p.brief.teamsLink}>Teams folder</LinkTag>}
              </div>
            </Section>
          ) : (
            <Section title="The brief" badge="Not submitted">
              <p className="text-sm text-muted">
                No brief yet. This started as a request — Sales still needs to specify deliverables,
                references, and a deadline before it&apos;s scoped work.
              </p>
            </Section>
          )}

          {p.description && (
            <Section title="Description">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{p.description}</p>
            </Section>
          )}

          {/* Comments */}
          <Section title="Comments" badge={`${p.comments.length}`}>
            <div className="mb-4"><AddComment id={p.id} /></div>
            <div className="space-y-3">
              {p.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author.name} color={c.author.color} size={30} />
                  <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-surface-2 px-3.5 py-2.5">
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-[11px] text-faint">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-ink/90">{c.body}</p>
                  </div>
                </div>
              ))}
              {p.comments.length === 0 && (
                <p className="text-sm text-faint">No comments yet. Start the thread.</p>
              )}
            </div>
          </Section>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          {/* Revisions */}
          <Section title="Revisions" badge={`${p.revisions.length}`}>
            <div className="mb-3"><AddRevision id={p.id} /></div>
            <ol className="relative space-y-3 border-l border-hairline pl-4">
              {p.revisions.map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-[#d24b8f]" />
                  <div className="text-sm font-medium">{r.label}</div>
                  {r.note && <div className="text-xs text-muted">{r.note}</div>}
                  <div className="text-[11px] text-faint">
                    {r.createdBy.name} · {format(new Date(r.createdAt), "MMM d")}
                  </div>
                </li>
              ))}
              {p.revisions.length === 0 && <li className="text-sm text-faint">No revisions logged.</li>}
            </ol>
          </Section>

          {/* Files */}
          <Section title="Files & links" badge={`${p.attachments.length}`}>
            <div className="mb-3"><AddAttachment id={p.id} /></div>
            <div className="space-y-1.5">
              {p.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                  <FileText size={15} className="shrink-0 text-faint" />
                  <span className="flex-1 truncate">{a.name}</span>
                  <ExternalLink size={13} className="text-faint" />
                </a>
              ))}
              {p.attachments.length === 0 && <p className="text-sm text-faint">No files linked.</p>}
            </div>
          </Section>

          {/* Audit */}
          <Section title="Activity log">
            <ol className="relative space-y-3 border-l border-hairline pl-4">
              {p.activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-faint" />
                  <div className="text-sm">
                    <span className="font-medium">{a.user?.name ?? "System"}</span>{" "}
                    <span className="text-muted">{a.action}</span>
                    {a.detail && <span className="text-faint"> — {a.detail}</span>}
                  </div>
                  <div className="text-[11px] text-faint">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {badge && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-0.5 text-xs font-medium text-faint">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{children}</div>
    </div>
  );
}

function Tag({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
      <Icon size={13} className="text-faint" /> {children}
    </span>
  );
}

function LinkTag({ icon: Icon, href, children }: { icon: any; href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink hover:opacity-80">
      <Icon size={13} /> {children}
    </a>
  );
}
