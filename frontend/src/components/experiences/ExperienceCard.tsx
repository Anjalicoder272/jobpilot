"use client";

import { Check, ChevronDown, Copy, Sparkles, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { Badge, CompanyAvatar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Experience, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

const RESULT_TONE = { SELECTED: "success", REJECTED: "danger", PENDING: "warning" } as const;
const DIFFICULTY = {
  EASY: { label: "Easy", color: "var(--success)" },
  MEDIUM: { label: "Medium", color: "var(--warning)" },
  HARD: { label: "Hard", color: "var(--danger)" },
};

function CopyButton({ text }: { text: string }) {
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
      title={copied ? "Copied" : "Copy"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-subtle transition-all hover:bg-surface-3 hover:text-text focus-visible:opacity-100 sm:opacity-0 sm:group-hover/q:opacity-100"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

function VoteButton({ question }: { question: Question }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState({ votes: question.votes, voted: question.voted });
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (pending) return;
    const before = state;
    setPending(true);
    setState({ votes: state.votes + (state.voted ? -1 : 1), voted: !state.voted });
    try {
      setState(await post<{ votes: number; voted: boolean }>(`/api/questions/${question.id}/vote/`));
    } catch {
      setState(before);
      toast({ title: "Couldn't save your vote", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={state.voted}
      aria-label={`I was asked this too${state.votes ? `, ${state.votes} so far` : ""}`}
      title="I was asked this too"
      className={cn(
        "tabular inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
        state.voted ? "border-accent/30 bg-accent-soft text-accent-text" : "border-border text-subtle hover:border-border-strong hover:text-text",
      )}
    >
      <ThumbsUp size={13} className={cn("transition-transform duration-200", state.voted && "-rotate-12 fill-current")} />
      {state.votes > 0 && state.votes}
    </button>
  );
}

function ExperienceCard({ exp, matchedIds }: { exp: Experience; matchedIds?: Set<number> }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = matchedIds?.size
    ? [...exp.questions].sort((a, b) => Number(matchedIds.has(b.id)) - Number(matchedIds.has(a.id)))
    : exp.questions;
  const questions = expanded ? ordered : ordered.slice(0, 3);
  const date = exp.interviewed_on && new Date(exp.interviewed_on).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-xs transition-shadow duration-200 hover:shadow-sm sm:p-6">
      <header className="flex items-start gap-3">
        <CompanyAvatar name={exp.company} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight">{exp.company}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">
            {exp.role} · {exp.level_label}
          </p>
        </div>
        <Badge tone={RESULT_TONE[exp.result]}>{exp.result_label}</Badge>
      </header>

      <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-subtle">
        <span>{exp.rounds} round{exp.rounds === 1 ? "" : "s"}</span>
        {date && <span>· {date}</span>}
        <span>· by {exp.author}</span>
      </p>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text/90">{exp.summary}</p>

      <div className="mt-5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-subtle">Questions asked · {exp.questions.length}</h4>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
          {questions.map((q) => {
            const hit = matchedIds?.has(q.id);
            return (
              <li key={q.id} className={cn("group/q flex items-start gap-3 px-3.5 py-2.5 transition-colors", hit ? "bg-accent-soft" : "hover:bg-surface-2/60")}>
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: DIFFICULTY[q.difficulty].color }}
                  title={DIFFICULTY[q.difficulty].label}
                  aria-label={`${DIFFICULTY[q.difficulty].label} question`}
                />
                <span className="min-w-0 flex-1 pt-1 text-sm">
                  {hit && <Sparkles size={13} className="mr-1.5 inline text-accent-text" aria-label="Best match" />}
                  {q.text}
                  <span className="ml-2 whitespace-nowrap text-xs text-subtle">{q.topic_label}</span>
                </span>
                <CopyButton text={q.text} />
                <VoteButton question={q} />
              </li>
            );
          })}
        </ul>
        {exp.questions.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-2 inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            {expanded ? "Show less" : `Show all ${exp.questions.length} questions`}
            <ChevronDown size={15} className={cn("transition-transform duration-200", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    </article>
  );
}

export default memo(ExperienceCard);
