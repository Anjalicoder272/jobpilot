"use client";

import { BookOpen, CheckCircle2, Circle, Globe, Lightbulb, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import type { Application, PrepPlan } from "@/lib/types";
import { SourceBadge, useAIStatus } from "./AIBadge";
import WebExperienceList from "../experiences/WebExperienceList";
import type { CompanyInsights } from "@/lib/types";

type PlanResponse = { plan: PrepPlan | null; generated_at: string | null };

// Ticked tasks are remembered in this browser only.
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

export default function PrepPanel({ app }: { app: Application }) {
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { done, toggle } = useChecked(app.id);
  const ai = useAIStatus();
  const [webPosts, setWebPosts] = useState<CompanyInsights["web_experiences"]>(null);

  // Real experience posts from other sites (only when web search is configured; results are cached).
  useEffect(() => {
    if (!ai?.web_search) return;
    api<CompanyInsights>(`/api/insights/?company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}`)
      .then((d) => setWebPosts(d.web_experiences))
      .catch(() => {});
  }, [ai?.web_search, app.company, app.role]);

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
      setPlan((await post<PlanResponse>(`/api/applications/${app.id}/prep/`)).plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the plan");
    } finally {
      setBusy(false);
    }
  }

  const allTasks = plan?.days.flatMap((d) => d.tasks.map((_, i) => `${d.day}-${i}`)) ?? [];
  const progress = allTasks.length ? Math.round((allTasks.filter((t) => done.includes(t)).length / allTasks.length) * 100) : 0;

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-border">
      <div className="bg-gradient-brand flex items-center justify-between gap-2 px-5 py-4 text-white">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <BookOpen size={18} /> Interview prep · {app.company}
        </h3>
        {plan && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{progress}% done</span>}
      </div>

      <div className="bg-surface p-5">
        {loading ? (
          <div className="skeleton h-24" />
        ) : !plan ? (
          <div className="text-center">
            <p className="text-sm text-muted">
              Get the most-asked topics at {app.company}, likely questions, and a 3-day plan built from real interview
              experiences{app.jd_text ? ", the job description" : ""} and your resume.
            </p>
            <button
              onClick={generate}
              disabled={busy}
              className="press bg-gradient-brand mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
            >
              <Target size={16} className={busy ? "animate-pulse" : ""} />
              {busy ? "Building your plan…" : "Prepare me"}
            </button>
            <p className="mt-3 text-xs text-muted">
              Tip: look up{" "}
              <Link href={`/insights?company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}`} className="font-semibold text-brand">
                {app.company} interview insights
              </Link>{" "}
              to see real shared questions and links to first-hand experiences.
            </p>
          </div>
        ) : (
          <div className="pop-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {plan.based_on
                  ? `Based on ${plan.based_on} real question${plan.based_on > 1 ? "s" : ""} shared for ${app.company}`
                  : `No shared ${app.company} interviews yet, so this is based on the job description`}
              </span>
              <SourceBadge source={plan.source} />
            </div>

            {/* Progress bar */}
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="bg-gradient-brand h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            {/* Focus topics */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Focus on</h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {plan.focus_topics.map((f) => (
                  <div key={f.label} className="rounded-2xl bg-surface-2 p-3">
                    <div className="text-sm font-semibold text-brand">{f.label}</div>
                    <div className="mt-0.5 text-xs text-muted">{f.why}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Day plan with checkboxes */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Your 3-day plan</h4>
              <ol className="mt-2 space-y-3">
                {plan.days.map((d) => (
                  <li key={d.day} className="rounded-2xl border border-border p-3">
                    <div className="text-sm font-semibold">
                      Day {d.day} · {d.title}
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {d.tasks.map((task, i) => {
                        const id = `${d.day}-${i}`;
                        const checked = done.includes(id);
                        return (
                          <li key={id}>
                            <button
                              onClick={() => toggle(id)}
                              aria-pressed={checked}
                              className="flex w-full items-start gap-2 text-left text-sm"
                            >
                              {checked ? (
                                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#10b981]" />
                              ) : (
                                <Circle size={18} className="mt-0.5 shrink-0 text-muted" />
                              )}
                              <span className={checked ? "text-muted line-through" : ""}>{task}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>

            {/* Likely questions */}
            {plan.likely_questions.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Likely questions</h4>
                <ul className="mt-2 space-y-2">
                  {plan.likely_questions.map((q) => (
                    <li key={q.question} className="flex items-start gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">
                      <span className="flex-1">{q.question}</span>
                      {q.source === "real" ? (
                        <span className="shrink-0 rounded-full bg-[#10b981]/15 px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                          Asked at {app.company}
                        </span>
                      ) : q.source === "online" ? (
                        <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                          Reported online
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                          Suggested
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Real posts on other sites */}
            {webPosts && webPosts.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Real {app.company} experiences online</h4>
                <div className="mt-2">
                  <WebExperienceList items={webPosts.slice(0, 5)} compact />
                </div>
              </section>
            )}

            {/* Tips */}
            {plan.tips.length > 0 && (
              <section className="rounded-2xl bg-brand-soft p-4">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                  <Lightbulb size={16} /> Tips
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {plan.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              <button onClick={generate} disabled={busy}
                className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-60">
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Rebuilding…" : "Rebuild plan"}
              </button>
              <Link href={`/insights?company=${encodeURIComponent(app.company)}&role=${encodeURIComponent(app.role)}`}
                className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold">
                <Globe size={15} /> {app.company} interview insights
              </Link>
              <Link href={`/experiences?company=${app.company_slug}`}
                className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold">
                <BookOpen size={15} /> All {app.company} experiences
              </Link>
            </div>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-[#e11d48]">{error}</p>}
      </div>
    </div>
  );
}
