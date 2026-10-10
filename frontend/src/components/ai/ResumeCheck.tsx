"use client";

import { ArrowRight, CheckCircle2, Link2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, post } from "@/lib/api";
import { atLeast } from "@/lib/utils";
import type { Application, ResumeCheck as ResumeCheckResult } from "@/lib/types";
import { SourceBadge } from "./AIBadge";
import ScoreRing from "./ScoreRing";
import SkillList from "./SkillList";

const VERDICT = {
  ready: { title: "Ready to apply", text: "Your resume is a strong match for this job.", tone: "text-success" },
  almost: { title: "Almost there", text: "A good match. A few additions will make it stronger.", tone: "text-accent-text" },
  needs_work: { title: "Needs some work", text: "Several things this job asks for aren't on your resume yet.", tone: "text-warning" },
};

export default function ResumeCheck() {
  const [jobUrl, setJobUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [mode, setMode] = useState<"link" | "paste">("link");
  const [result, setResult] = useState<ResumeCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState({ company: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Application | null>(null);
  const toast = useToast();

  const canSubmit = mode === "link" ? /^https?:\/\/\S+\.\S+/.test(jobUrl.trim()) : jdText.trim().length >= 80;

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError(mode === "link" ? "Paste a full job link starting with https://" : "Paste a few lines of the description (at least 80 characters).");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(null);
    try {
      const data = await atLeast(post<ResumeCheckResult>("/api/resume/check/", mode === "link" ? { job_url: jobUrl.trim() } : { jd_text: jdText.trim() }), 600);
      setResult(data);
      setBoard({ company: data.job.company, role: data.job.title });
      if (data.verdict === "ready") toast({ title: "Strong match", description: `${data.score}% fit. You're ready to apply.` });
      requestAnimationFrame(() => document.getElementById("check-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      const message = errorMessage(err, "Couldn't check.");
      setError(message);
      if (/paste/i.test(message)) setMode("paste");
    } finally {
      setBusy(false);
    }
  }

  async function addToBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!result || !board.company.trim() || !board.role.trim()) return setError("Enter the company and role to add it.");
    setSaving(true);
    try {
      const app = await post<Application>("/api/applications/", {
        company: board.company.trim(),
        role: board.role.trim(),
        job_url: result.job.url,
        jd_text: result.job.description,
      });
      setSaved(await post<Application>(`/api/applications/${app.id}/match/`).catch(() => app));
      toast({ title: "Added to your board", description: `${board.role} · ${board.company}` });
    } catch (err) {
      setError(errorMessage(err, "Couldn't add it to your board."));
    } finally {
      setSaving(false);
    }
  }

  const verdict = result ? VERDICT[result.verdict] : null;

  return (
    <div className="space-y-6">
      <form onSubmit={check} noValidate className="space-y-4">
        {mode === "link" ? (
          <Field label="Job link" hint="Most job boards and careers pages work. LinkedIn usually blocks reading, so paste instead.">
            <div className="relative">
              <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <Input type="url" inputMode="url" className="pl-9" placeholder="https://careers.company.com/jobs/123" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} disabled={busy} />
            </div>
          </Field>
        ) : (
          <Field label="Job description">
            <Textarea rows={8} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full job description" maxLength={20000} disabled={busy} />
          </Field>
        )}
        <FormError message={error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy}>
            Check my resume
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "link" ? "paste" : "link");
              setError("");
            }}
            className="text-sm font-medium text-muted underline-offset-4 hover:text-text hover:underline"
          >
            {mode === "link" ? "Paste the description instead" : "Use a job link instead"}
          </button>
        </div>
        {busy && <p className="text-xs text-subtle">Reading the job and comparing it with your resume. This can take up to 20 seconds.</p>}
      </form>

      {result && verdict && (
        <div id="check-result" className="animate-fade-up scroll-mt-20 space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ScoreRing score={result.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-lg font-semibold tracking-tight ${verdict.tone}`}>{verdict.title}</h3>
                  <SourceBadge source={result.source} />
                </div>
                {(result.job.title || result.job.company) && (
                  <p className="mt-0.5 text-sm font-medium">
                    {result.job.title}
                    {result.job.company && <span className="text-muted"> · {result.job.company}</span>}
                  </p>
                )}
                <p className="mt-1.5 text-sm text-muted">{result.summary || verdict.text}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
              <SkillList title="Already on your resume" skills={result.matched} kind="have" empty="None detected." />
              <SkillList
                title="Missing"
                skills={result.missing}
                kind="missing"
                empty={
                  <span className="inline-flex items-center gap-1 font-medium text-success">
                    <CheckCircle2 size={14} /> Nothing important missing
                  </span>
                }
              />
            </div>
          </Card>

          {result.suggestions.length > 0 && (
            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">What to add or change</h3>
              <ul className="mt-3 space-y-2.5">
                {result.suggestions.map((s) => (
                  <li key={s} className="flex gap-2.5 text-sm">
                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-subtle" /> {s}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-subtle">Only add skills you genuinely have. Interviewers will ask about them.</p>
            </Card>
          )}

          <Card className="p-5">
            {saved ? (
              <p className="animate-fade-up flex flex-wrap items-center gap-2 text-sm">
                <CheckCircle2 size={16} className="text-success" /> Added to your board with its match score.
                <Link href="/board" className="font-medium underline underline-offset-4">
                  Open board
                </Link>
              </p>
            ) : (
              <form onSubmit={addToBoard} noValidate>
                <h3 className="text-[15px] font-semibold">Applying? Track it on your board</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="Company">
                    <Input value={board.company} onChange={(e) => setBoard({ ...board, company: e.target.value })} placeholder="Company name" maxLength={120} />
                  </Field>
                  <Field label="Role">
                    <Input value={board.role} onChange={(e) => setBoard({ ...board, role: e.target.value })} placeholder="Job title" maxLength={150} />
                  </Field>
                  <Button type="submit" variant="secondary" loading={saving}>
                    <Plus size={15} /> Add to board
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
