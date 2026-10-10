import { CalendarDays, Check, Copy, Layers, Sparkles, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Experience, Question } from "@/lib/types";
import { companyColor } from "../board/JobCard";
import Spotlight from "../fx/Spotlight";

const RESULT_STYLE: Record<Experience["result"], { bg: string; fg: string }> = {
  SELECTED: { bg: "#10b98122", fg: "#059669" },
  REJECTED: { bg: "#f43f5e1f", fg: "#e11d48" },
  PENDING: { bg: "#f59e0b22", fg: "#d97706" },
};

const DIFFICULTY_COLOR = { EASY: "#10b981", MEDIUM: "#f59e0b", HARD: "#f43f5e" };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={copied ? "Copied" : "Copy question"}
      title={copied ? "Copied!" : "Copy question"}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-surface hover:text-brand focus-visible:opacity-100 group-hover/q:opacity-100"
    >
      {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
    </button>
  );
}

/** "I was asked this too": optimistic toggle, rolled back if the request fails. */
function VoteButton({ question }: { question: Question }) {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState({ votes: question.votes, voted: question.voted });

  async function toggle() {
    if (!user) return router.push("/login");
    const before = state;
    setState({ votes: state.votes + (state.voted ? -1 : 1), voted: !state.voted });
    try {
      setState(await post<{ votes: number; voted: boolean }>(`/api/questions/${question.id}/vote/`));
    } catch {
      setState(before);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={state.voted}
      title={state.voted ? "You were asked this too" : "I was asked this too"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition hover:scale-105 ${
        state.voted ? "bg-gradient-brand text-white" : "bg-surface text-muted hover:text-brand"
      }`}
    >
      <ThumbsUp size={12} className={state.voted ? "fill-current" : ""} />
      {state.votes > 0 && state.votes}
    </button>
  );
}

function ExperienceCard({ exp, matchedIds }: { exp: Experience; matchedIds?: Set<number> }) {
  const [expanded, setExpanded] = useState(false);
  const result = RESULT_STYLE[exp.result];
  // In smart search, show matched questions first so the reason for the result is visible.
  const ordered = matchedIds?.size
    ? [...exp.questions].sort((a, b) => Number(matchedIds.has(b.id)) - Number(matchedIds.has(a.id)))
    : exp.questions;
  const questions = expanded ? ordered : ordered.slice(0, 3);

  return (
    <Spotlight as="article" className="rounded-3xl border border-border bg-surface p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
      <header className="flex flex-wrap items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display font-bold text-white"
          style={{ background: companyColor(exp.company) }}
        >
          {exp.company.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-tight">{exp.company}</h3>
          <p className="text-sm text-muted">
            {exp.role} · {exp.level_label}
          </p>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: result.bg, color: result.fg }}>
          {exp.result_label}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Layers size={13} /> {exp.rounds} rounds
        </span>
        {exp.interviewed_on && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {new Date(exp.interviewed_on).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </span>
        )}
        <span>Shared by {exp.author}</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed">{exp.summary}</p>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Questions asked</h4>
        <ul className="mt-2 space-y-2">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className={`group/q pop-in flex items-start gap-3 rounded-2xl px-4 py-3 transition hover:bg-brand-soft/60 ${
                matchedIds?.has(q.id) ? "bg-brand-soft ring-1 ring-brand/30" : "bg-surface-2"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: DIFFICULTY_COLOR[q.difficulty] }}
                title={q.difficulty.toLowerCase()}
              />
              <span className="flex-1 text-sm">
                {matchedIds?.has(q.id) && <Sparkles size={13} className="mr-1.5 inline text-brand" aria-label="Best match" />}
                {q.text}
              </span>
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                {q.topic_label}
              </span>
              <CopyButton text={q.text} />
              <VoteButton question={q} />
            </li>
          ))}
        </ul>
        {exp.questions.length > 3 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-brand">
            {expanded ? "Show less" : `Show all ${exp.questions.length} questions`}
          </button>
        )}
      </div>
    </Spotlight>
  );
}

export default memo(ExperienceCard);
