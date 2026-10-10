"use client";

import { ArrowUpRight, Lightbulb, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Badge, SectionLabel, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, post } from "@/lib/api";
import type { Application, CompanyInsights, PrepPlan } from "@/lib/types";
import { atLeast, cn } from "@/lib/utils";
import WebExperienceList from "../experiences/WebExperienceList";
import { SourceBadge, useAIStatus } from "./AIBadge";

type PlanResponse = { plan: PrepPlan | null; generated_at: string | null };

function useChecked(appId: number) {
  const key = `prep-done-${appId}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {}
  }, [key]);
  function toggle(id: string) {
    setDone((d) => {
      const next = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  return { done, toggle };
}

const SOURCE = {
  real: { label: "Asked here", tone: "success" as const },
  online: { label: "Reported online", tone: "accent" as const },
  suggested: { label: "Suggested", tone: "neutral" as const },
};

export default function PrepPanel({ app }: { app: Application }) {
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { done, toggle } = useChecked(app.id);
  const ai = useAIStatus();
  const toast = useToast();
  const [webPosts, setWebPosts] = useState<CompanyInsights["web_experiences"]>(null);
  const insightsHref = `/insights?company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}`;

  useEffect(() => {
    if (!ai?.web_search || !plan) return;
    api<CompanyInsights>(`/api/insights/?company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}`)
      .then((d) => setWebPosts(d.web_experiences))
      .catch(() => {});
  }, [ai?.web_search, app.company, app.role, plan]);

  useEffect(() => {
    api<PlanResponse>(`/api/applications/${app.id}/prep/`)
      .then((r) => setPlan(r.plan))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [app.id]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setPlan((await atLeast(post<PlanResponse>(`/api/applications/${app.id}/prep/`), 600)).plan);
      toast({ title: plan ? "Prep plan rebuilt" : "Your prep plan is ready" });
    } catch (e) {
      setError(errorMessage(e, "Couldn't build the plan."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent-text">
          <Target size={20} />
        </span>
        <h3 className="mt-4 text-[15px] font-semibold">Get a 3-day plan for {app.company}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Built from questions real candidates were asked here{app.jd_text ? ", the job description" : ""} and your resume.
        </p>
        <FormError message={error} />
        <Button onClick={generate} loading={busy} className="mt-5">
          <Target size={15} /> Prepare me
        </Button>
        {busy && <p className="mt-3 text-xs text-subtle">This takes about 10 to 20 seconds.</p>}
      </div>
    );
  }

  const allTasks = plan.days.flatMap((d) => d.tasks.map((_, i) => `${d.day}-${i}`));
  const completed = allTasks.filter((t) => done.includes(t)).length;
  const progress = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;

  return (
    <div className="animate-fade-up space-y-7">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {plan.based_on
              ? `Based on ${plan.based_on} real question${plan.based_on > 1 ? "s" : ""} shared for ${app.company}.`
              : `No shared ${app.company} interviews yet, so this follows the job description.`}
          </p>
          <SourceBadge source={plan.source} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Prep progress">
            <div className="h-full rounded-full bg-success transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular text-xs font-medium text-muted">
            {completed}/{allTasks.length} done
          </span>
        </div>
      </div>

      <section>
        <SectionLabel>Focus on</SectionLabel>
        <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {plan.focus_topics.map((f) => (
            <li key={f.label} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{f.label}</p>
              <p className="mt-0.5 text-[13px] text-muted">{f.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel>Your 3-day plan</SectionLabel>
        <ol className="mt-2.5 space-y-4">
          {plan.days.map((d) => (
            <li key={d.day}>
              <p className="text-sm font-medium">
                <span className="text-subtle">Day {d.day} · </span>
                {d.title}
              </p>
              <ul className="mt-1.5">
                {d.tasks.map((task, i) => {
                  const id = `${d.day}-${i}`;
                  const checked = done.includes(id);
                  return (
                    <li key={id}>
                      <label className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-[var(--success)]"
                        />
                        <span className={cn("text-sm transition-colors", checked && "text-subtle line-through")}>{task}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {plan.likely_questions.length > 0 && (
        <section>
          <SectionLabel>Likely questions</SectionLabel>
          <ul className="mt-2.5 divide-y divide-border rounded-xl border border-border">
            {plan.likely_questions.map((q) => (
              <li key={q.question} className="flex items-start gap-3 px-3.5 py-3 text-sm">
                <span className="flex-1">{q.question}</span>
                <Badge tone={SOURCE[q.source].tone}>{SOURCE[q.source].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {webPosts && webPosts.length > 0 && (
        <section>
          <SectionLabel>Real {app.company} experiences online</SectionLabel>
          <div className="mt-2.5">
            <WebExperienceList items={webPosts.slice(0, 5)} compact />
          </div>
        </section>
      )}

      {plan.tips.length > 0 && (
        <section className="rounded-xl bg-surface-2 p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-medium">
            <Lightbulb size={15} className="text-warning" /> Tips
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {plan.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-subtle" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={generate} loading={busy}>
          <RefreshCw size={15} /> Rebuild plan
        </Button>
        <ButtonLink href={insightsHref} variant="secondary">
          {app.company} insights <ArrowUpRight size={15} />
        </ButtonLink>
        <Link href={`/experiences?company=${app.company_slug}`} className="inline-flex h-10 items-center px-2 text-sm font-medium text-muted hover:text-text">
          All {app.company} experiences
        </Link>
      </div>
    </div>
  );
}
