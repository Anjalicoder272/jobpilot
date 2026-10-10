"use client";

import { ArrowRight, CheckCircle2, Link2, Plus, Rocket, Search, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { post } from "@/lib/api";
import type { Application, ResumeCheck as ResumeCheckResult } from "@/lib/types";
import { fireConfetti } from "../fx/confetti";
import { Field, inputClass } from "../ui/Field";
import { SourceBadge } from "./AIBadge";
import ScoreRing from "./ScoreRing";

const VERDICT = {
  ready: { title: "Ready to go! 🚀", text: "Your resume is a strong match for this job. Apply with confidence.", color: "#10b981", icon: Rocket },
  almost: { title: "Almost there", text: "A good match. A few small additions will make it stronger.", color: "#3b82f6", icon: Wrench },
  needs_work: { title: "Needs some work", text: "Several things this job asks for aren't on your resume yet.", color: "#f59e0b", icon: Wrench },
};

/** "Ready to go" celebration popup. */
function ReadyPopup({ result, onClose }: { result: ResumeCheckResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Ready to go">
      <div className="absolute inset-0 bg-[#071026]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="pop-in relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-pop">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-surface-2">
          <X size={18} />
        </button>
        <span className="float mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#10b981]/15 text-[#10b981]">
          <Rocket size={38} />
        </span>
        <h2 className="mt-5 font-display text-3xl font-extrabold">Good to go! 🎉</h2>
        <p className="mt-2 text-muted">
          Your resume matches <b>{result.score}%</b> of what{" "}
          {result.job.company ? <b>{result.job.company}</b> : "this job"} is looking for.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {result.matched.slice(0, 6).map((s) => (
            <span key={s} className="rounded-full bg-[#10b981]/15 px-2.5 py-0.5 text-xs font-semibold text-[#059669]">✓ {s}</span>
          ))}
        </div>
        <button onClick={onClose} className="press bg-gradient-brand mt-7 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-card">
          Awesome, let&apos;s apply
        </button>
      </div>
    </div>
  );
}

export default function ResumeCheck() {
  const [jobUrl, setJobUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [result, setResult] = useState<ResumeCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState(false);
  const [board, setBoard] = useState({ company: "", role: "" });
  const [saved, setSaved] = useState<Application | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setSaved(null);
    try {
      const data = await post<ResumeCheckResult>("/api/resume/check/", { job_url: jobUrl.trim(), jd_text: jdText.trim() });
      setResult(data);
      setBoard({ company: data.job.company, role: data.job.title });
      if (data.verdict === "ready") {
        fireConfetti();
        setPopup(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't check";
      setError(message);
      if (/paste/i.test(message)) setShowPaste(true); // the site blocked reading: open the paste box
    } finally {
      setBusy(false);
    }
  }

  async function addToBoard() {
    if (!result || !board.company.trim() || !board.role.trim()) return setError("Enter the company and role to add it.");
    try {
      const app = await post<Application>("/api/applications/", {
        company: board.company.trim(),
        role: board.role.trim(),
        job_url: result.job.url,
        jd_text: result.job.description,
      });
      setSaved(await post<Application>(`/api/applications/${app.id}/match/`).catch(() => app));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add it to your board");
    }
  }

  const verdict = result ? VERDICT[result.verdict] : null;

  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <span className="bg-gradient-brand grid h-7 w-7 place-items-center rounded-full text-sm text-white">2</span>
        Check it against a job
      </h2>
      <p className="mt-1 text-sm text-muted">Paste a job link (or the description) to see if you&apos;re ready to apply.</p>

      <form onSubmit={check} className="mt-5 space-y-3">
        <Field label="Job description link">
          <div className="relative">
            <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="url" className={`${inputClass} pl-10`} placeholder="https://www.naukri.com/job-listings-…"
              value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
          </div>
        </Field>
        {showPaste ? (
          <Field label="Or paste the job description" hint="Use this if a site doesn't allow automatic reading, or the job is in an email or PDF.">
            <textarea className={`${inputClass} min-h-32`} value={jdText} onChange={(e) => setJdText(e.target.value)} />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowPaste(true)} className="text-sm font-semibold text-brand">
            Or paste the job description instead
          </button>
        )}
        <div>
          <button type="submit" disabled={busy || (!jobUrl.trim() && jdText.trim().length < 80)}
            className="press bg-gradient-brand inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-50">
            <Search size={16} className={busy ? "animate-pulse" : ""} /> {busy ? "Checking your resume…" : "Check my resume"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#f43f5e]/10 px-4 py-3 text-sm text-[#e11d48]">{error}</p>}

      {result && verdict && (
        <div className="pop-in mt-6 space-y-5">
          {/* Verdict */}
          <div className="flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center" style={{ borderColor: `${verdict.color}55`, background: `${verdict.color}12` }}>
            <ScoreRing score={result.score} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-extrabold" style={{ color: verdict.color }}>{verdict.title}</h3>
                <SourceBadge source={result.source} />
              </div>
              <p className="mt-1 text-sm">{verdict.text}</p>
              {(result.job.title || result.job.company) && (
                <p className="mt-1 text-xs text-muted">
                  {result.job.title}{result.job.company && ` · ${result.job.company}`}
                </p>
              )}
              {result.summary && <p className="mt-2 text-sm text-muted">{result.summary}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Already on your resume</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.matched.map((s) => (
                  <span key={s} className="rounded-full bg-[#10b981]/15 px-2.5 py-0.5 text-xs font-semibold text-[#059669]">✓ {s}</span>
                ))}
                {result.matched.length === 0 && <span className="text-sm text-muted">None detected.</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Missing</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missing.map((s) => (
                  <span key={s} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{s}</span>
                ))}
                {result.missing.length === 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#059669]"><CheckCircle2 size={15} /> Nothing important missing</span>
                )}
              </div>
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="rounded-2xl border border-border p-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold"><Wrench size={15} className="text-brand" /> What to add or change</h4>
              <ul className="mt-2 space-y-1.5 text-sm">
                {result.suggestions.map((s) => (
                  <li key={s} className="flex gap-2"><ArrowRight size={15} className="mt-0.5 shrink-0 text-brand" /> {s}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Only add skills you genuinely have. Interviewers will ask about them.</p>
            </div>
          )}

          {/* Save to board */}
          <div className="rounded-2xl bg-brand-soft p-4">
            {saved ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <CheckCircle2 size={16} className="text-[#10b981]" /> Added to your board.
                <Link href="/board" className="font-semibold text-brand">Open my board →</Link>
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label="Company">
                  <input className={inputClass} value={board.company} onChange={(e) => setBoard({ ...board, company: e.target.value })} />
                </Field>
                <Field label="Role">
                  <input className={inputClass} value={board.role} onChange={(e) => setBoard({ ...board, role: e.target.value })} />
                </Field>
                <button onClick={addToBoard}
                  className="press bg-gradient-brand inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
                  <Plus size={16} /> Add to my board
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {popup && result && <ReadyPopup result={result} onClose={() => setPopup(false)} />}
    </section>
  );
}
