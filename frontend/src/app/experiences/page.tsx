"use client";

import { PenSquare, Search, Sparkles, TrendingUp } from "lucide-react";
import { useAIStatus } from "@/components/ai/AIBadge";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import BackToTop from "@/components/BackToTop";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import Reveal from "@/components/Reveal";
import { inputClass } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { LEVELS, TOPICS, type Experience, type Page, type TopicCount } from "@/lib/types";

// DRF returns an absolute "next" URL; keep only the path so it goes through our /api proxy.
const toRelative = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

function ExperiencesFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const company = params.get("company") ?? "";
  const level = params.get("level") ?? "";
  const topic = params.get("topic") ?? "";
  const search = params.get("search") ?? "";
  const smart = params.get("smart") === "1";
  const ai = useAIStatus();

  const [items, setItems] = useState<Experience[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState<TopicCount[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState(search);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);
  const filtersKey = `${company}|${level}|${topic}|${search}|${smart}`;
  const currentFilters = useRef(filtersKey);
  currentFilters.current = filtersKey;

  // Filters live in the URL, so a filtered view can be shared or bookmarked.
  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  // Wait 300 ms after typing stops before searching.
  useEffect(() => {
    const t = setTimeout(() => searchText !== search && setParam("search", searchText.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // First page: reload whenever a filter changes. AbortController drops stale responses.
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ company, level, topic, search, smart: smart && search ? "1" : "" });
    for (const [k, v] of [...query]) if (!v) query.delete(k);
    setLoading(true);
    setError("");
    setNext(null); // stop infinite scroll from loading pages of the old filter
    api<Page<Experience>>(`/api/experiences/?${query}`, { signal: controller.signal })
      .then((page) => {
        setItems(page.results);
        setNext(page.next ? toRelative(page.next) : null);
        setMatchedIds(new Set(page.matched_question_ids ?? []));
      })
      .catch((e) => !controller.signal.aborted && setError(e.message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    api<TopicCount[]>(`/api/experiences/topics/${company ? `?company=${company}` : ""}`, { signal: controller.signal })
      .then(setTopics)
      .catch(() => {});
    return () => controller.abort();
  }, [company, level, topic, search, smart]);

  // Infinite scroll: when the invisible sentinel below the list comes into view, load the next page.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loadingMore.current) return;
        loadingMore.current = true;
        const startedFor = currentFilters.current;
        try {
          const page = await api<Page<Experience>>(next);
          if (startedFor !== currentFilters.current) return; // filters changed meanwhile: ignore
          // Skip anything already shown, so the same card never appears twice.
          setItems((prev) => {
            const seen = new Set(prev.map((e) => e.id));
            return [...prev, ...page.results.filter((e) => !seen.has(e.id))];
          });
          setNext(page.next ? toRelative(page.next) : null);
        } catch {
          setError("Couldn't load more experiences.");
        } finally {
          loadingMore.current = false;
        }
      },
      { rootMargin: "400px" }, // start loading a little before the user reaches the end
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [next]);

  const maxCount = topics[0]?.count ?? 1;
  const companyName = company && items[0]?.company_slug === company ? items[0].company : company;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {company ? `${companyName} interview experiences` : "Interview experiences"}
          </h1>
          <p className="mt-1 text-sm text-muted">Real questions from real candidates. Filter by level and topic.</p>
        </div>
        <Link
          href="/experiences/new"
          className="press animated-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-card"
        >
          <PenSquare size={16} /> Share your experience
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search experiences"
            placeholder={smart ? "Describe what you want, e.g. async code, making pages faster" : "Search a question, company or role, e.g. debounce"}
            className={`${inputClass} pl-10 ${ai?.smart_search ? "pr-32" : ""}`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {ai?.smart_search && (
            <button
              onClick={() => setParam("smart", smart ? "" : "1")}
              aria-pressed={smart}
              title="Find questions by meaning, not just exact words"
              className={`absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                smart ? "bg-gradient-brand text-white" : "bg-surface-2 text-muted hover:text-brand"
              }`}
            >
              <Sparkles size={13} /> Smart search
            </button>
          )}
        </div>
        {/* Level: segmented buttons */}
        <div role="group" aria-label="Level" className="flex rounded-xl bg-surface-2 p-1">
          {[{ value: "", label: "All" }, ...LEVELS].map((l) => (
            <button
              key={l.value}
              onClick={() => setParam("level", l.value)}
              aria-pressed={level === l.value}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                level === l.value ? "bg-surface text-brand shadow-card" : "text-muted hover:text-text"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {(company || level || topic || search) && (
          <button
            onClick={() => {
              setSearchText("");
              router.replace(pathname, { scroll: false });
            }}
            className="text-sm font-semibold text-brand"
          >
            Clear
          </button>
        )}
      </div>

      {/* Topic chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Topic">
        {[{ value: "", label: "All topics" }, ...TOPICS].map((t) => (
          <button
            key={t.value}
            onClick={() => setParam("topic", t.value)}
            aria-pressed={topic === t.value}
            className={`press whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium ${
              topic === t.value
                ? "border-transparent bg-gradient-brand text-white shadow-card"
                : "border-border bg-surface text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Feed */}
        <div className="space-y-5" aria-busy={loading}>
          {error && <p role="alert" className="text-sm text-[#e11d48]">{error}</p>}
          {smart && search && !loading && items.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Sparkles size={14} className="text-brand" /> Showing the closest matches by meaning for “{search}”. Matching
              questions are highlighted.
            </p>
          )}
          {loading
            ? [1, 2, 3].map((i) => <div key={i} className="skeleton h-64" />)
            : items.map((exp) => (
                <Reveal key={exp.id}>
                  <ExperienceCard exp={exp} matchedIds={smart ? matchedIds : undefined} />
                </Reveal>
              ))}
          {!loading && items.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center">
              <p className="font-semibold">No experiences match these filters yet.</p>
              <p className="mt-1 text-sm text-muted">Be the first to share one.</p>
            </div>
          )}
          <div ref={sentinel} />
          {next && !loading && <div className="skeleton h-40" aria-label="Loading more" />}
          {!next && !loading && items.length > 0 && (
            <p className="py-4 text-center text-sm text-muted">You&apos;ve reached the end.</p>
          )}
        </div>

        {/* Most-asked topics */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <TrendingUp size={18} className="text-brand" /> Most-asked topics
            </h2>
            <p className="mt-1 text-xs text-muted">{company ? `At ${companyName}` : "Across all companies"}</p>
            <ul className="mt-4 space-y-3">
              {topics.map((t) => (
                <li key={t.topic}>
                  <button onClick={() => setParam("topic", topic === t.topic ? "" : t.topic)} className="w-full text-left">
                    <div className="flex justify-between text-sm">
                      <span className={topic === t.topic ? "font-semibold text-brand" : ""}>{t.label}</span>
                      <span className="text-muted">{t.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-gradient-brand h-full rounded-full transition-all duration-700" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                    </div>
                  </button>
                </li>
              ))}
              {topics.length === 0 && <li className="text-sm text-muted">No data yet.</li>}
            </ul>
          </div>
        </aside>
      </div>
      <BackToTop />
    </div>
  );
}

export default function ExperiencesPage() {
  return (
    <Suspense>
      <ExperiencesFeed />
    </Suspense>
  );
}
