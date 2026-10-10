import { BellRing, Check } from "lucide-react";
import { CompanyAvatar } from "@/components/ui/primitives";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="rounded-2xl border border-border bg-surface-2/60 p-2 shadow-md">
      <div aria-hidden className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
}

export function TrackPreview() {
  const rows = [
    { company: "Nimbus Labs", role: "Frontend Engineer", stage: "Applied", color: "var(--stage-applied)", due: true },
    { company: "Lumen AI", role: "SDE-1, Web", stage: "HR replied", color: "var(--stage-replied)" },
    { company: "Atlas Travel", role: "Full Stack Engineer", stage: "Interview", color: "var(--stage-interview)" },
  ];
  return (
    <Frame label="Example board with three applications and a follow-up reminder">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
        {[
          ["12", "Applications"],
          ["58%", "Response rate"],
          ["3", "Interviews"],
        ].map(([v, l]) => (
          <div key={l} className="px-2 py-2.5">
            <p className="tabular text-lg font-semibold">{v}</p>
            <p className="text-[11px] text-subtle">{l}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.company} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
            <CompanyAvatar name={r.company} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{r.role}</p>
              <p className="truncate text-xs text-muted">{r.company}</p>
            </div>
            {r.due ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning">
                <BellRing size={11} /> Follow up
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                {r.stage}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function MatchPreview() {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <Frame label="Example resume match: 82 percent, with matched and missing skills">
      <div className="flex items-center gap-4">
        <svg width="72" height="72" className="-rotate-90 shrink-0">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--success)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.18} />
        </svg>
        <div>
          <p className="text-[15px] font-semibold text-success">Ready to apply · 82%</p>
          <p className="mt-0.5 text-xs text-muted">Strong React and TypeScript fit. Show more testing work.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["React", "TypeScript", "Next.js", "REST APIs"].map((s) => (
          <span key={s} className="inline-flex h-6 items-center gap-1 rounded-md bg-success-soft px-1.5 text-[11px] font-medium text-success">
            <Check size={11} /> {s}
          </span>
        ))}
        {["Jest", "GraphQL"].map((s) => (
          <span key={s} className="inline-flex h-6 items-center rounded-md border border-dashed border-warning/40 px-1.5 text-[11px] font-medium text-warning">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
        <span className="font-medium text-text">Suggestion:</span> If you&apos;ve written tests with Jest, add them to your current role.
      </p>
    </Frame>
  );
}

export function PrepPreview() {
  const tasks = [
    { t: "Revise closures, promises and the event loop", done: true },
    { t: "Write debounce and throttle from scratch", done: true },
    { t: "Sketch an infinite feed: API, caching, pagination", done: false },
  ];
  return (
    <Frame label="Example interview prep plan with a checklist and labelled questions">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium">
          <span className="text-subtle">Day 1 · </span>Core concepts
        </p>
        <span className="tabular text-[11px] text-subtle">2/3 done</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full w-2/3 rounded-full bg-success" />
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li key={task.t} className="flex items-start gap-2 text-xs">
            <span className={`mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded border ${task.done ? "border-success bg-success text-white" : "border-border-strong"}`}>
              {task.done && <Check size={10} strokeWidth={3} />}
            </span>
            <span className={task.done ? "text-subtle line-through" : ""}>{task.t}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border text-xs">
        <li className="flex items-center justify-between gap-2 px-2.5 py-2">
          <span className="truncate">Implement a debounce function</span>
          <span className="shrink-0 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success">Asked here</span>
        </li>
        <li className="flex items-center justify-between gap-2 px-2.5 py-2">
          <span className="truncate">How would you cut a 4s LCP?</span>
          <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">Suggested</span>
        </li>
      </ul>
    </Frame>
  );
}
