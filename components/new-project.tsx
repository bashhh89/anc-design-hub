"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProject } from "@/lib/actions";

const field =
  "h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft";
const labelCls = "mb-1.5 block text-xs font-medium text-muted";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-medium text-white shadow-card transition hover:bg-accent-hover"
      >
        <Plus size={16} /> New project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm">
          <div className="mt-[6vh] w-full max-w-xl animate-fade-up rounded-2xl border border-hairline bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  New design project
                </h2>
                <p className="text-xs text-muted">
                  A brief turns a request into scoped work. Fill what you know.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={(fd) =>
                start(async () => {
                  const id = await createProject(fd);
                  setOpen(false);
                  router.push(`/projects/${id}`);
                  router.refresh();
                })
              }
              className="grid grid-cols-2 gap-4 px-6 py-5"
            >
              <div className="col-span-2">
                <label className={labelCls}>Project name</label>
                <input name="name" required autoFocus placeholder="e.g. Rams stadium concourse renders" className={field} />
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <select name="category" className={field} defaultValue="EXTERNAL">
                  <option value="EXTERNAL">External</option>
                  <option value="INTERNAL">Internal</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select name="type" className={field} defaultValue="DESIGN">
                  <option value="DESIGN">Design</option>
                  <option value="DEVELOPMENT">Development</option>
                  <option value="ENGINEERING">Engineering</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Priority</label>
                <select name="priority" className={field} defaultValue="MEDIUM">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Due date</label>
                <input type="date" name="dueDate" className={field} />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>Linked opportunity (CRM)</label>
                <input name="crmOpportunityName" placeholder="Optional — the Sales opportunity this supports" className={field} />
              </div>

              <div className="col-span-2 mt-1 rounded-xl border border-dashed border-hairline bg-surface-2 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent-ink">
                  The brief
                </div>
                <label className={labelCls}>Deliverables — what does Sales need?</label>
                <textarea name="deliverables" rows={3} placeholder="List the renders / assets, sizes, formats…" className={field.replace("h-10", "h-auto py-2.5")} />
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Reference links</label>
                    <input name="references" placeholder="Drive / inspiration" className={field} />
                  </div>
                  <div>
                    <label className={labelCls}>Hard deadline</label>
                    <input type="date" name="deadline" className={field} />
                  </div>
                  <div>
                    <label className={labelCls}>Email link</label>
                    <input name="emailLink" placeholder="Email thread URL" className={field} />
                  </div>
                  <div>
                    <label className={labelCls}>Teams folder</label>
                    <input name="teamsLink" placeholder="Teams / SharePoint URL" className={field} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-xl px-4 text-sm font-medium text-muted hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-9 rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {pending ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
