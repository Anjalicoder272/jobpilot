"use client";

import { CheckCircle2, Clock, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SourceBadge } from "@/components/ai/AIBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ApiError, errorMessage, post } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { LEVELS, TOPICS, type Experience } from "@/lib/types";

type QuestionDraft = { key: number; text: string; topic: string; difficulty: string };
let nextKey = 1;
const emptyQuestion = (): QuestionDraft => ({ key: nextKey++, text: "", topic: "JAVASCRIPT", difficulty: "MEDIUM" });
const MAX_QUESTIONS = 30;

type Errors = Partial<Record<"company" | "role" | "summary" | "questions" | "rounds", string>>;

export default function NewExperiencePage() {
  const { ready } = useRequireAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ company: "", role: "", level: "SDE1", result: "PENDING", rounds: "3", summary: "", interviewed_on: "" });
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractSource, setExtractSource] = useState<"" | "ai" | "basic">("");
  const [heldForReview, setHeldForReview] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (errors[key as keyof Errors]) setErrors({ ...errors, [key]: undefined });
  };

  async function extract() {
    setExtracting(true);
    setFormError("");
    try {
      const res = await post<{ questions: Omit<QuestionDraft, "key">[]; source: "ai" | "basic" }>("/api/experiences/extract/", { notes });
      if (res.questions.length === 0) {
        toast({ title: "No questions found", description: "Put each question on its own line, or end it with a question mark.", tone: "info" });
      } else {
        setQuestions((qs) => [...qs.filter((q) => q.text.trim()), ...res.questions.map((q) => ({ ...q, key: nextKey++ }))].slice(0, MAX_QUESTIONS));
        setExtractSource(res.source);
        toast({ title: `Added ${res.questions.length} question${res.questions.length > 1 ? "s" : ""}`, description: "Check the topic and difficulty below." });
      }
    } catch (err) {
      toast({ title: "Couldn't extract questions", description: errorMessage(err), tone: "error" });
    } finally {
      setExtracting(false);
    }
  }

  function updateQuestion(key: number, changes: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...changes } : q)));
    if (errors.questions) setErrors({ ...errors, questions: undefined });
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.company.trim()) e.company = "Enter the company.";
    if (!form.role.trim()) e.role = "Enter the role.";
    if (form.summary.trim().length < 20) e.summary = "Write a few lines about how it went.";
    const rounds = Number(form.rounds);
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) e.rounds = "Between 1 and 20.";
    if (!questions.some((q) => q.text.trim().length >= 5)) e.questions = "Add at least one question you were asked.";
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const created = await post<Experience>("/api/experiences/", {
        ...form,
        rounds: Number(form.rounds),
        interviewed_on: form.interviewed_on || null,
        questions: questions.filter((q) => q.text.trim()).map(({ text, topic, difficulty }) => ({ text, topic, difficulty })),
      });
      if (created.is_published === false) {
        setHeldForReview(created.moderation_note || "Your post is waiting for review.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast({ title: "Thanks for sharing", description: "Your experience is live." });
      router.push(`/experiences?company=${created.company_slug}`);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(errorMessage(err, "Could not share."));
    } finally {
      setBusy(false);
    }
  }

  if (heldForReview) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="animate-scale-in mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning-soft text-warning">
          <Clock size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Thanks, it&apos;s waiting for a quick review</h1>
        <p className="mt-2 text-sm text-muted">Your experience was saved and will appear once it&apos;s approved. {heldForReview}</p>
        <ButtonLink href="/experiences" variant="secondary" className="mt-6">
          Back to experiences
        </ButtonLink>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-8 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <PageHeader title="Share your interview experience" description="Help the next candidate prepare. It takes about five minutes." />
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-2/70 px-3.5 py-3 text-[13px] text-muted">
        <ShieldCheck size={16} className="mt-px shrink-0 text-success" />
        Only your first name is shown. Emails and phone numbers are removed automatically. Please don&apos;t name your interviewers.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-6">
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">The interview</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required error={errors.company}>
              <Input value={form.company} onChange={set("company")} placeholder="e.g. Atlassian" maxLength={120} />
            </Field>
            <Field label="Role" required error={errors.role}>
              <Input value={form.role} onChange={set("role")} placeholder="e.g. Frontend Engineer" maxLength={150} />
            </Field>
            <Field label="Level">
              <Select value={form.level} onChange={set("level")}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Result">
              <Select value={form.result} onChange={set("result")}>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING">Waiting for result</option>
              </Select>
            </Field>
            <Field label="Number of rounds" error={errors.rounds}>
              <Input type="number" inputMode="numeric" min={1} max={20} value={form.rounds} onChange={set("rounds")} />
            </Field>
            <Field label="Interview date" optional>
              <Input type="date" value={form.interviewed_on} onChange={set("interviewed_on")} max={new Date().toLocaleDateString("en-CA")} />
            </Field>
          </div>
          <Field label="How did it go?" required error={errors.summary} hint="Round by round: what each covered and how you prepared.">
            <Textarea
              rows={5}
              value={form.summary}
              onChange={set("summary")}
              maxLength={10000}
              placeholder="Round 1 was a 60-minute DSA round on arrays and hashing. Round 2 focused on React..."
            />
          </Field>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Questions you were asked</h2>
            <p className="mt-0.5 text-sm text-muted">Add them one by one, or paste rough notes and pull them out automatically.</p>
          </div>

          <details className="group rounded-lg border border-border">
            <summary className="flex h-11 list-none items-center gap-2 px-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <Sparkles size={15} className="text-accent-text" /> Paste rough notes instead
              <span className="ml-auto text-xs text-subtle group-open:hidden">Optional</span>
            </summary>
            <div className="space-y-3 border-t border-border p-3.5">
              <Textarea
                aria-label="Interview notes"
                rows={5}
                maxLength={10000}
                placeholder={"Round 1: longest substring without repeating characters\nRound 2: useMemo vs useCallback?\nHow would you design an infinite feed?"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={extract} loading={extracting} disabled={notes.trim().length < 20}>
                  <Sparkles size={14} /> Extract questions
                </Button>
                {extractSource && (
                  <span className="inline-flex items-center gap-2 text-xs text-subtle">
                    <CheckCircle2 size={13} className="text-success" /> Added below <SourceBadge source={extractSource} />
                  </span>
                )}
              </div>
            </div>
          </details>

          <ol className="space-y-2.5">
            {questions.map((q, i) => (
              <li key={q.key} className="animate-fade-up rounded-lg border border-border bg-surface-2/40 p-3">
                <div className="flex items-start gap-2">
                  <span className="tabular mt-2.5 w-5 shrink-0 text-xs text-subtle">{i + 1}.</span>
                  <Input
                    aria-label={`Question ${i + 1}`}
                    placeholder="e.g. Implement a debounce function"
                    value={q.text}
                    maxLength={500}
                    aria-invalid={!!errors.questions && i === 0 && !q.text.trim() ? true : undefined}
                    onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
                  />
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                      className="shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 pl-7">
                  <Select aria-label={`Topic for question ${i + 1}`} value={q.topic} onChange={(e) => updateQuestion(q.key, { topic: e.target.value })}>
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label={`Difficulty for question ${i + 1}`} value={q.difficulty} onChange={(e) => updateQuestion(q.key, { difficulty: e.target.value })}>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </Select>
                </div>
              </li>
            ))}
          </ol>
          {errors.questions && <p className="text-xs font-medium text-danger">{errors.questions}</p>}
          {questions.length < MAX_QUESTIONS && (
            <Button variant="ghost" size="sm" onClick={() => setQuestions([...questions, emptyQuestion()])}>
              <Plus size={15} /> Add another question
            </Button>
          )}
        </Card>

        <FormError message={formError} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ButtonLink href="/experiences" variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit" loading={busy}>
            Share experience
          </Button>
        </div>
      </form>
    </div>
  );
}
