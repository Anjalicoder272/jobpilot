"use client";

import { CheckCircle2, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { Field, PrimaryButton, inputClass } from "@/components/ui/Field";
import { SourceBadge } from "@/components/ai/AIBadge";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, TOPICS, type Experience } from "@/lib/types";

type QuestionDraft = { text: string; topic: string; difficulty: string };
const emptyQuestion = (): QuestionDraft => ({ text: "", topic: "JAVASCRIPT", difficulty: "MEDIUM" });

export default function NewExperiencePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ company: "", role: "", level: "SDE1", result: "PENDING", rounds: 3, summary: "", interviewed_on: "" });
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractSource, setExtractSource] = useState<"" | "ai" | "basic">("");
  const [heldForReview, setHeldForReview] = useState("");

  // Paste raw notes -> get a clean list of tagged questions.
  async function extract() {
    setExtracting(true);
    setError("");
    try {
      const res = await post<{ questions: QuestionDraft[]; source: "ai" | "basic" }>("/api/experiences/extract/", { notes });
      if (res.questions.length === 0) {
        setError("No questions found. Put each question on its own line, or end it with a question mark.");
      } else {
        // Keep questions the user already typed, then add the extracted ones.
        setQuestions((qs) => [...qs.filter((q) => q.text.trim()), ...res.questions]);
        setExtractSource(res.source);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't extract questions");
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function updateQuestion(i: number, changes: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...changes } : q)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await post<Experience>("/api/experiences/", {
        ...form,
        interviewed_on: form.interviewed_on || null,
        questions: questions.filter((q) => q.text.trim()),
      });
      if (created.is_published === false) {
        setHeldForReview(created.moderation_note || "Your post is waiting for review.");
        setBusy(false);
        return;
      }
      router.push(`/experiences?company=${created.company_slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share");
      setBusy(false);
    }
  }

  if (heldForReview) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Thanks for sharing!</h1>
        <p className="mt-2 text-sm text-muted">
          Your experience was saved and will appear after a quick review. Reason: {heldForReview}
        </p>
        <button onClick={() => router.push("/experiences")} className="press bg-gradient-brand mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
          Back to experiences
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Share your interview experience</h1>
        <p className="mt-1 text-sm text-muted">
          Help the next candidate. Only your first name is shown. Emails and phone numbers are removed automatically,
          and please don&apos;t include interviewer names.
        </p>
      </Reveal>
      <Reveal delay={100}>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company *">
              <input className={inputClass} required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Role *">
              <input className={inputClass} required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
            <Field label="Level">
              <select className={inputClass} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Result">
              <select className={inputClass} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING">Result pending</option>
              </select>
            </Field>
            <Field label="Number of rounds">
              <input className={inputClass} type="number" min={1} max={10} value={form.rounds}
                onChange={(e) => setForm({ ...form, rounds: Number(e.target.value) })} />
            </Field>
            <Field label="Interview date">
              <input className={inputClass} type="date" value={form.interviewed_on}
                onChange={(e) => setForm({ ...form, interviewed_on: e.target.value })} />
            </Field>
          </div>
          <Field label="How did it go? *" hint="Round by round: what each round covered and how you prepared.">
            <textarea className={`${inputClass} min-h-32`} required value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </Field>

          {/* Quick fill from raw notes */}
          <div className="rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-brand" /> Have rough notes? Paste them and we&apos;ll pull out the questions
            </div>
            <textarea
              aria-label="Interview notes"
              className={`${inputClass} mt-3 min-h-28`}
              placeholder={"e.g.\nRound 1: online test, longest substring without repeating characters\nRound 2: what is the difference between useMemo and useCallback?\nHow would you design an infinite feed?"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={extract}
                disabled={extracting || notes.trim().length < 20}
                className="press bg-gradient-brand inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-50"
              >
                <Sparkles size={15} className={extracting ? "animate-spin" : ""} />
                {extracting ? "Finding questions…" : "Extract questions"}
              </button>
              {extractSource && (
                <span className="inline-flex items-center gap-2 text-xs text-muted">
                  Added below <SourceBadge source={extractSource} />
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">Questions you were asked *</span>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="rounded-2xl bg-surface-2 p-3">
                  <div className="flex gap-2">
                    <input aria-label={`Question ${i + 1}`} className={inputClass} placeholder="e.g. Implement debounce"
                      value={q.text} onChange={(e) => updateQuestion(i, { text: e.target.value })} />
                    {questions.length > 1 && (
                      <button type="button" aria-label="Remove question" className="rounded-xl px-2 text-muted hover:text-text"
                        onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select aria-label="Topic" className={inputClass} value={q.topic} onChange={(e) => updateQuestion(i, { topic: e.target.value })}>
                      {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select aria-label="Difficulty" className={inputClass} value={q.difficulty} onChange={(e) => updateQuestion(i, { difficulty: e.target.value })}>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setQuestions([...questions, emptyQuestion()])}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
              <Plus size={16} /> Add another question
            </button>
          </div>

          {error && <p role="alert" className="rounded-xl bg-[#f43f5e]/10 px-3 py-2 text-sm text-[#e11d48]">{error}</p>}
          <PrimaryButton type="submit" disabled={busy} className="w-full py-3">
            {busy ? "Sharing…" : "Share experience"}
          </PrimaryButton>
        </form>
      </Reveal>
    </div>
  );
}
