"use client";

import { PenSquare, Search, SearchX, Sparkles, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAIStatus } from "@/components/ai/AIBadge";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Card, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorMessage } from "@/lib/api";
import { LEVELS, TOPICS, type Experience, type Page, type TopicCount } from "@/lib/types";
import { cn } from "@/lib/utils";

const toRelative = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

export default function ExperiencesFeed({
  initial,
  initialTopics,
  initialKey,
}: {
  initial: Page<Experience> | null;
  initialTopics: TopicCount[] | null;
  initialKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const company = params.get("company") ?? "";
  const level = params.get("level") ?? "";
  const topic = params.get("topic") ?? "";
  const search = params.get("search") ?? "";
  const smart = params.get("smart") === "1";
  const ai = useAIStatus();

  const [items, setItems] = useState<Experience[]>(initial?.results ?? []);
  const [next, setNext] = useState<string | null>(initial?.next ? toRelative(initial.next) : null);
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [topics, setTopics] = useState<TopicCount[]>(initialTopics ?? []);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState(search);
  const sentinel = useRef<HTMLDivElement>(null);
  const busyMore = useRef(false);
  const filtersKey = `${company}|${level}|${topic}|${search}|${smart}`;
  const currentFilters = useRef(filtersKey);
  currentFilters.current = filtersKey;
  const skipFirst = useRef(!!initial && initialKey === filtersKey);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    const t = setTimeout(() => searchText.trim() !== search && setParam("search", searchText.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ company, level, topic, search, smart: smart && search ? "1" : "" });
    for (const [k, v] of [...query]) if (!v) query.delete(k);
    setLoading(true);
    setError("");
    setNext(null);
    api<Page<Experience>>(`/api/experiences/?${query}`, { signal: controller.signal })
      .then((page) => {
        setItems(page.results);
        setNext(page.next ? toRelative(page.next) : null);
        setMatchedIds(new Set(page.matched_question_ids ?? []));
      })
      .catch((e) => !controller.signal.aborted && setError(errorMessage(e, "Couldn't load experiences.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    api<TopicCount[]>(`/api/experiences/topics/${company ? `?company=${encodeURIComponent(company)}` : ""}`, { signal: controller.signal })
      .then(setTopics)
      .catch(() => {});
    return () => controller.abort();
  }, [company, level, topic, search, smart]);

  async function loadMore() {
    if (!next || busyMore.current) return;
    busyMore.current = true;
    setLoadingMore(true);
    const startedFor = currentFilters.current;
    try {
      const page = await api<Page<Experience>>(next);
      if (startedFor !== currentFilters.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...page.results.filter((e) => !seen.has(e.id))];
      });
      setNext(page.next ? toRelative(page.next) : null);
    } catch {
      setError("Couldn't load more experiences.");
    } finally {
      busyMore.current = false;
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  const maxCount = topics[0]?.count ?? 1;
  const companyName = company && items[0]?.company_slug === company ? items[0].company : company.replace(/-/g, " ");
  const hasFilters = !!(company || level || topic || search);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
      <PageHeader
        title={company ? `${companyName} interview experiences` : "Interview experiences"}
        description="Real questions from real candidates, round by round. Filter by level and topic, or mark the ones you were asked too."
        actions={
          <ButtonLink href="/experiences/new" variant="secondary" className="max-sm:w-full">
            <PenSquare size={15} /> Share yours
          </ButtonLink>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            aria-label="Search experiences"
            placeholder={smart ? "Describe it, e.g. making pages load faster" : "Search questions, companies or roles"}
            className={cn(inputClass, "pl-9", ai?.smart_search ? "pr-[118px]" : "pr-9")}
            value={searchText}
            maxLength={200}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {ai?.smart_search ? (
            <button
              onClick={() => setParam("smart", smart ? "" : "1")}
              aria-pressed={smart}
              title="Search by meaning, not just exact words"
              className={cn(
                "absolute right-1 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                smart ? "bg-accent-soft text-accent-text" : "text-subtle hover:bg-surface-2 hover:text-text",
              )}
            >
              <Sparkles size={13} /> Smart search
            </button>
          ) : (
            searchText && (
              <button onClick={() => setSearchText("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-text">
                <X size={14} />
              </button>
            )
          )}
        </div>
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <Segmented label="Level" value={level} onChange={(v) => setParam("level", v)} options={[{ value: "", label: "All levels" }, ...LEVELS]} />
        </div>
      </div>

      <div role="group" aria-label="Topic" className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ value: "", label: "All topics" }, ...TOPICS].map((t) => (
          <button
            key={t.value}
            onClick={() => setParam("topic", t.value)}
            aria-pressed={topic === t.value}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors pointer-coarse:h-10",
              topic === t.value ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-muted hover:border-border-strong hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
        {hasFilters && (
          <button
            onClick={() => {
              setSearchText("");
              router.replace(pathname, { scroll: false });
            }}
            className="h-8 shrink-0 px-2 text-[13px] font-medium text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4" aria-busy={loading}>
          {smart && search && !loading && items.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Sparkles size={14} className="text-accent-text" /> Closest matches by meaning for &ldquo;{search}&rdquo;. Matching questions are highlighted.
            </p>
          )}
          {error && (
            <EmptyState title="Something went wrong" description={error} action={<Button variant="secondary" onClick={() => router.refresh()}>Try again</Button>} />
          )}
          {loading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-60 rounded-xl" />)
            : items.map((exp) => <ExperienceCard key={exp.id} exp={exp} matchedIds={smart ? matchedIds : undefined} />)}
          {!loading && !error && items.length === 0 && (
            <EmptyState
              icon={<SearchX size={20} />}
              title={hasFilters ? "No experiences match these filters" : "No experiences yet"}
              description={hasFilters ? "Try a different topic or level, or clear the filters." : "Be the first to share one and help the next candidate."}
              action={<ButtonLink href="/experiences/new" variant="secondary">Share your experience</ButtonLink>}
            />
          )}
          <div ref={sentinel} />
          {next && !loading && (
            <div className="flex justify-center py-4">
              {loadingMore ? <Spinner size={18} className="text-subtle" /> : <Button variant="ghost" onClick={loadMore}>Load more</Button>}
            </div>
          )}
          {!next && !loading && items.length > 0 && <p className="py-6 text-center text-xs text-subtle">You&apos;ve reached the end.</p>}
        </div>

        <aside className="hidden lg:block">
          <Card className="p-5 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold">Most-asked topics</h2>
            <p className="mt-0.5 text-xs text-subtle">{company ? `At ${companyName}` : "Across all companies"}</p>
            <ul className="mt-4 space-y-1">
              {topics.slice(0, 8).map((t) => (
                <li key={t.topic}>
                  <button
                    onClick={() => setParam("topic", topic === t.topic ? "" : t.topic)}
                    aria-pressed={topic === t.topic}
                    className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="flex justify-between text-[13px]">
                      <span className={topic === t.topic ? "font-medium text-text" : "text-muted"}>{t.label}</span>
                      <span className="tabular text-subtle">{t.count}</span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className={cn("block h-full rounded-full transition-[width] duration-500", topic === t.topic ? "bg-accent" : "bg-border-strong")}
                        style={{ width: `${(t.count / maxCount) * 100}%` }}
                      />
                    </span>
                  </button>
                </li>
              ))}
              {topics.length === 0 && <li className="text-sm text-subtle">No data yet.</li>}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
