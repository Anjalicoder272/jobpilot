"use client";

import { Building2, Check, Copy, ExternalLink, Globe, Lightbulb, ListChecks, RefreshCw, Search, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import WebExperienceList from "@/components/experiences/WebExperienceList";
import { inputClass } from "@/components/ui/Field";
import { ApiError, api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CompanyInsights } from "@/lib/types";

const POPULAR = [
  ["Amazon", "SDE-1"],
  ["Google", "Software Engineer"],
  ["Microsoft", "SDE"],
  ["Flipkart", "SDE-1"],
  ["Atlassian", "Frontend Engineer"],
  ["Swiggy", "Frontend Developer"],
];

const TYPE_STYLE = {
  coding: { label: "Coding", color: "#3b82f6" },
  technical: { label: "Technical", color: "#8b5cf6" },
  behavioral: { label: "Behavioral", color: "#f59e0b" },
};

function CopyQuestion({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy question"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:text-brand group-hover:opacity-100"
    >
      {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
    </button>
  );
}

function InsightsView() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qCompany = params.get("company") ?? "";
  const qRole = params.get("role") ?? "";

  const [company, setCompany] = useState(qCompany);
  const [role, setRole] = useState(qRole);
  const [data, setData] = useState<CompanyInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // The search lives in the URL, so results can be bookmarked and shared.
  useEffect(() => {
    if (!user || !qCompany || !qRole) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<CompanyInsights>(`/api/insights/?company=${encodeURIComponent(qCompany)}&role=${encodeURIComponent(qRole)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => !controller.signal.aborted && setError(e instanceof ApiError && e.status === 429
        ? "You've reached the hourly limit for AI lookups. Try again a bit later."
        : e.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [user, qCompany, qRole]);

  function search(c = company, r = role) {
    if (c.trim().length < 2 || r.trim().length < 2) return setError("Enter a company and a job title.");
    setCompany(c);
    setRole(r);
    router.push(`${pathname}?company=${encodeURIComponent(c.trim())}&role=${encodeURIComponent(r.trim())}`);
  }

  async function refresh() {
    setLoading(true);
    try {
      setData(await post<CompanyInsights>("/api/insights/", { company: qCompany, role: qRole }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't refresh");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Company interview insights</h1>
        <p className="mt-1 text-sm text-muted">
          Type any company and job title to find real interview experiences: posts on LeetCode, GeeksforGeeks,
          Glassdoor and more, plus questions shared on JobPilot. Click any post to read it on the original site.
        </p>
      </Reveal>

      {/* Search */}
      <Reveal delay={80}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
          className="mt-6 grid gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="relative">
            <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Company" className={`${inputClass} pl-10`} placeholder="Company, e.g. Amazon"
              value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Job title" className={`${inputClass} pl-10`} placeholder="Job title, e.g. SDE-1"
              value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className="press bg-gradient-brand inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60">
            <Search size={16} /> Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR.map(([c, r]) => (
            <button key={c} onClick={() => search(c, r)}
              className="press rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted hover:border-brand hover:text-brand">
              {c} · {r}
            </button>
          ))}
        </div>
      </Reveal>

      {error && <p role="alert" className="mt-6 rounded-xl bg-[#f43f5e]/10 px-4 py-3 text-sm text-[#e11d48]">{error}</p>}

      {loading && (
        <div className="mt-8 space-y-4" aria-busy="true">
          <p className="text-center text-sm text-muted">Looking up {qCompany} interviews…</p>
          <div className="skeleton h-28" />
          <div className="grid gap-4 sm:grid-cols-2"><div className="skeleton h-40" /><div className="skeleton h-40" /></div>
          <div className="skeleton h-64" />
        </div>
      )}

      {data && !loading && (
        <div className="mt-8 space-y-6">
          {/* Header + honesty label */}
          <div className="pop-in rounded-3xl border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold">{data.company}</h2>
                <p className="text-sm text-muted">{data.role}</p>
              </div>
              <button onClick={refresh} className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-text">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
            {data.mode === "web" && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm">
                <Globe size={16} className="mt-0.5 shrink-0 text-brand" />
                Summarised from public web sources (listed below). Open the sources to read the original experiences.
              </p>
            )}
            {data.overview && <p className="mt-4 leading-relaxed">{data.overview}</p>}
          </div>

          {/* Rounds */}
          {!!data.rounds?.length && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <h3 className="flex items-center gap-2 font-display font-bold"><ListChecks size={18} className="text-brand" /> Interview rounds</h3>
              <ol className="mt-4 space-y-4">
                {data.rounds.map((r, i) => (
                  <li key={r.name} className="pop-in flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="bg-gradient-brand grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-sm text-muted">{r.what}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Topics */}
          {!!data.topics?.length && (
            <section>
              <h3 className="mb-3 font-display font-bold">What they focus on</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.topics.map((t) => (
                  <div key={t.label} className="rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
                    <div className="font-semibold text-brand">{t.label}</div>
                    <div className="mt-1 text-sm text-muted">{t.detail}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Questions */}
          {!!data.questions?.length && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <h3 className="font-display font-bold">
                Commonly reported questions ({data.questions.length})
              </h3>
              <ul className="mt-4 space-y-2">
                {data.questions.map((q) => (
                  <li key={q.question} className="group flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                    <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: `${TYPE_STYLE[q.type].color}1f`, color: TYPE_STYLE[q.type].color }}>
                      {TYPE_STYLE[q.type].label}
                    </span>
                    <span className="flex-1">{q.question}</span>
                    <CopyQuestion text={q.question} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Real posts on other sites (Tavily search) */}
          {data.web_experiences && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <Globe size={18} className="text-brand" /> Real experiences from the web
                {data.web_experiences.length > 0 && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">{data.web_experiences.length}</span>
                )}
              </h3>
              <p className="mt-1 text-xs text-muted">
                Written by candidates on other sites. Click a post to read the full experience there.
              </p>
              <div className="mt-4">
                {data.web_experiences.length > 0 ? (
                  <WebExperienceList items={data.web_experiences} />
                ) : (
                  <p className="text-sm text-muted">No posts found for this search. Try a shorter job title (e.g. &quot;SDE&quot;).</p>
                )}
              </div>
            </section>
          )}

          {/* Real JobPilot questions */}
          {data.community.length === 0 && (
            <section className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center">
              <Users size={28} className="mx-auto text-muted" />
              <h3 className="mt-3 font-display text-lg font-bold">No one has shared a {data.company} interview on JobPilot yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                {data.web_experiences?.length ? "Check the posts above for now, and if" : "Read first-hand experiences on the sites below, and if"}{" "}
                you&apos;ve interviewed at {data.company}, share yours to help the next candidate.
              </p>
              <a href="/experiences/new" className="press bg-gradient-brand mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-card">
                Share your experience
              </a>
            </section>
          )}
          {data.community.length > 0 && (
            <section className="rounded-3xl border border-[#10b981]/30 bg-surface p-6 shadow-card">
              <h3 className="flex items-center gap-2 font-display font-bold"><Users size={18} className="text-[#10b981]" /> Asked at {data.company}, shared on JobPilot</h3>
              <ul className="mt-4 space-y-2">
                {data.community.map((q) => (
                  <li key={q.question} className="flex items-start gap-3 rounded-2xl bg-[#10b981]/10 px-4 py-3 text-sm">
                    <span className="flex-1">{q.question}</span>
                    {q.votes > 0 && <span className="text-xs font-semibold text-[#059669]">👍 {q.votes}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tips */}
          {!!data.tips?.length && (
            <section className="rounded-3xl bg-brand-soft p-6">
              <h3 className="flex items-center gap-2 font-display font-bold text-brand"><Lightbulb size={18} /> Tips</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{data.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}

          {/* Sources + read more */}
          <section className="grid gap-4 sm:grid-cols-2">
            {data.sources.length > 0 && (
              <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
                <h3 className="font-display font-bold">Sources</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.sources.map((s) => (
                    <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-brand hover:underline">
                      <ExternalLink size={14} className="mt-0.5 shrink-0" /> {s.title}</a></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <h3 className="font-display font-bold">More {data.company} experiences on other sites</h3>
              <p className="mt-1 text-xs text-muted">
                These links open each site&apos;s search results, where candidates describe their own {data.company} interviews.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.links.map((l) => (
                  <a key={l.site} href={l.url} target="_blank" rel="noreferrer"
                    className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:border-brand hover:text-brand">
                    {l.site} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {!qCompany && !loading && (
        <p className="mt-10 text-center text-sm text-muted">Pick a popular search above or type your own.</p>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense>
      <InsightsView />
    </Suspense>
  );
}
