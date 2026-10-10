"use client";

import { Building2, Check, Copy, ExternalLink, Globe, Lightbulb, RefreshCw, Search, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import WebExperienceList from "@/components/experiences/WebExperienceList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError, bareInputClass } from "@/components/ui/Field";
import { Badge, Card, EmptyState, PageHeader, SectionLabel, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api, errorMessage, post } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import type { CompanyInsights } from "@/lib/types";
import { safeHref } from "@/lib/utils";

const POPULAR = [
  ["Amazon", "SDE-1"],
  ["Google", "Software Engineer"],
  ["Microsoft", "SDE"],
  ["Flipkart", "SDE-1"],
  ["Atlassian", "Frontend Engineer"],
  ["Swiggy", "Frontend Developer"],
];

const TYPE_LABEL = { coding: "Coding", technical: "Technical", behavioral: "Behavioral" };

function CopyQuestion({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast({ title: "Couldn't copy", tone: "error" });
        }
      }}
      aria-label={copied ? "Copied" : "Copy question"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-subtle transition-all hover:bg-surface-3 hover:text-text focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

function InsightsView() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const qCompany = params.get("company") ?? "";
  const qRole = params.get("role") ?? "";

  const [company, setCompany] = useState(qCompany);
  const [role, setRole] = useState(qRole);
  const [data, setData] = useState<CompanyInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCompany(qCompany);
    setRole(qRole);
  }, [qCompany, qRole]);

  useEffect(() => {
    if (!ready || !qCompany || !qRole) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<CompanyInsights>(`/api/insights/?company=${encodeURIComponent(qCompany)}&role=${encodeURIComponent(qRole)}`, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof ApiError && e.status === 429 ? "You've reached the hourly limit for lookups. Try again a bit later." : errorMessage(e));
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [ready, qCompany, qRole]);

  function search(c = company, r = role) {
    if (c.trim().length < 2 || r.trim().length < 2) return setError("Enter a company and a job title.");
    setError("");
    router.push(`${pathname}?company=${encodeURIComponent(c.trim())}&role=${encodeURIComponent(r.trim())}`);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      setData(await post<CompanyInsights>("/api/insights/", { company: qCompany, role: qRole }));
      toast({ title: "Insights refreshed" });
    } catch (e) {
      toast({ title: "Couldn't refresh", description: errorMessage(e), tone: "error" });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-8">
      <PageHeader
        title="Company insights"
        description="Look up any company and role to see how their interviews run, from real candidate posts and questions shared on JobPilot."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mt-6 grid gap-2 rounded-xl border border-border bg-surface p-2 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-accent/50 focus-within:ring-[3px] focus-within:ring-[var(--ring-soft)] sm:grid-cols-[1fr_1fr_auto]"
      >
        <div className="relative">
          <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input aria-label="Company" className={`${bareInputClass} pl-9`} placeholder="Company, e.g. Amazon" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
        </div>
        <div className="relative border-border max-sm:border-t sm:border-l">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input aria-label="Job title" className={`${bareInputClass} pl-9`} placeholder="Job title, e.g. SDE-1" value={role} onChange={(e) => setRole(e.target.value)} maxLength={150} />
        </div>
        <Button type="submit" loading={loading}>
          Search
        </Button>
      </form>
      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <span className="shrink-0 self-center text-xs text-subtle">Popular:</span>
        {POPULAR.map(([c, r]) => (
          <button
            key={c}
            onClick={() => search(c, r)}
            className="h-8 shrink-0 rounded-full border border-border bg-surface px-3 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-text pointer-coarse:h-10"
          >
            {c} · {r}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {loading && (
        <div className="mt-6 space-y-4" aria-busy aria-label={`Looking up ${qCompany} interviews`}>
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!qCompany && !loading && (
        <EmptyState
          className="mt-8"
          icon={<Building2 size={20} />}
          title="Search a company to start"
          description="You'll see interview rounds, common questions, and links to first-hand experiences on other sites."
        />
      )}

      {data && !loading && (
        <div className="stagger mt-6 space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{data.company}</h2>
                <p className="text-sm text-muted">{data.role}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing}>
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>
            {data.overview && <p className="mt-4 text-[15px] leading-relaxed">{data.overview}</p>}
            {data.mode === "web" && (
              <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
                <Globe size={14} className="mt-px shrink-0" />
                Summarised from public sources listed below. Open them to read the original experiences.
              </p>
            )}
          </Card>

          {!!data.rounds?.length && (
            <Card className="p-5 sm:p-6">
              <SectionLabel>Interview rounds</SectionLabel>
              <ol className="mt-4 space-y-4">
                {data.rounds.map((r, i) => (
                  <li key={r.name} className="flex gap-3.5">
                    <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-xs font-medium text-muted">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="mt-0.5 text-sm text-muted">{r.what}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {!!data.topics?.length && (
            <section>
              <SectionLabel>What they focus on</SectionLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {data.topics.map((t) => (
                  <Card key={t.label} className="p-4">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="mt-1 text-[13px] text-muted">{t.detail}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {!!data.questions?.length && (
            <Card className="p-5 sm:p-6">
              <SectionLabel>Commonly reported questions · {data.questions.length}</SectionLabel>
              <ul className="mt-3 divide-y divide-border">
                {data.questions.map((q) => (
                  <li key={q.question} className="group flex items-start gap-3 py-3 text-sm">
                    <Badge className="mt-px w-[84px] justify-center">{TYPE_LABEL[q.type]}</Badge>
                    <span className="flex-1">{q.question}</span>
                    <CopyQuestion text={q.question} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.web_experiences && (
            <section>
              <SectionLabel>Real experiences from the web</SectionLabel>
              <p className="mt-1 text-xs text-subtle">Written by candidates on other sites. Opens the original post.</p>
              <div className="mt-3">
                {data.web_experiences.length > 0 ? (
                  <WebExperienceList items={data.web_experiences} />
                ) : (
                  <p className="text-sm text-muted">No posts found. Try a shorter title, like &quot;SDE&quot;.</p>
                )}
              </div>
            </section>
          )}

          {data.community.length > 0 ? (
            <Card className="p-5 sm:p-6">
              <SectionLabel>Asked at {data.company} · shared on JobPilot</SectionLabel>
              <ul className="mt-3 divide-y divide-border">
                {data.community.map((q) => (
                  <li key={q.question} className="flex items-start gap-3 py-3 text-sm">
                    <span className="flex-1">{q.question}</span>
                    {q.votes > 0 && <Badge tone="success">{q.votes} also asked</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState
              icon={<Users size={20} />}
              title={`No ${data.company} interviews shared on JobPilot yet`}
              description={`If you've interviewed at ${data.company}, sharing your questions helps the next candidate.`}
              action={<ButtonLink href="/experiences/new" variant="secondary">Share your experience</ButtonLink>}
            />
          )}

          {!!data.tips?.length && (
            <Card className="bg-surface-2/60 p-5 sm:p-6">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <Lightbulb size={15} className="text-warning" /> Tips
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {data.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-subtle" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {data.sources.length > 0 && (
              <Card className="p-5">
                <SectionLabel>Sources</SectionLabel>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.sources.filter((s) => safeHref(s.url)).map((s) => (
                    <li key={s.url}>
                      <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-start gap-1.5 text-muted hover:text-text">
                        <ExternalLink size={13} className="mt-0.5 shrink-0" /> {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="p-5">
              <SectionLabel>Search other sites</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.links.map((l) => (
                  <a
                    key={l.site}
                    href={safeHref(l.url)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-text pointer-coarse:h-10"
                  >
                    {l.site} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
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
