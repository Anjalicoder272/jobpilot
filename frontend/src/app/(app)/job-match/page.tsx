"use client";

import { CheckCircle2, FileText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAIStatus } from "@/components/ai/AIBadge";
import ResumeCheck from "@/components/ai/ResumeCheck";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { FormError } from "@/components/ui/Field";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { api, del, errorMessage, upload } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import type { ResumeInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 sm:grid-cols-[32px_1fr] sm:gap-5">
      <div className="flex items-center gap-3 sm:flex-col sm:items-center">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-medium transition-colors",
            done ? "border-success/30 bg-success-soft text-success" : "border-border bg-surface text-muted",
          )}
        >
          {done ? <CheckCircle2 size={16} /> : n}
        </span>
        <h2 className="text-[15px] font-semibold sm:hidden">{title}</h2>
        <span aria-hidden className="hidden w-px flex-1 bg-border sm:block" />
      </div>
      <div className="min-w-0 pb-8">
        <h2 className="mb-4 hidden text-[15px] font-semibold sm:block">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function JobMatchPage() {
  const { ready } = useRequireAuth();
  const ai = useAIStatus();
  const toast = useToast();
  const confirm = useConfirm();
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) api<ResumeInfo>("/api/resume/").then(setResume).catch(() => setResume({ filename: "", skills: [], characters: 0, uploaded_at: null, has_resume: false }));
  }, [ready]);

  async function send(file: File) {
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (file.size > MAX_BYTES) return setError("That file is larger than 2 MB. Try exporting a lighter PDF.");
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const info = await upload<ResumeInfo>("/api/resume/", form);
      setResume(info);
      toast({ title: "Resume uploaded", description: `${info.skills.length} skills detected` });
    } catch (e) {
      setError(errorMessage(e, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({ title: "Remove your resume?", description: "Match scores and emails need a resume. You can upload a new one any time.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await del("/api/resume/");
      setResume({ filename: "", skills: [], characters: 0, uploaded_at: null, has_resume: false });
      toast({ title: "Resume removed", tone: "info" });
    } catch (e) {
      toast({ title: "Couldn't remove it", description: errorMessage(e), tone: "error" });
    }
  }

  const has = !!resume?.has_resume;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8">
      <PageHeader
        title="Job match"
        description="Check your resume against any job before you apply, and see exactly what to add."
        actions={ai && <Badge tone={ai.enabled ? "accent" : "neutral"}>{ai.enabled ? "AI matching on" : "Basic matching"}</Badge>}
      />

      <div className="mt-8">
        <Step n={1} title="Your resume" done={has}>
          {!resume ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : (
            <div className="space-y-4">
              {has && (
                <Card className="animate-fade-up p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{resume.filename}</p>
                      <p className="text-xs text-subtle">
                        {resume.uploaded_at && `Uploaded ${new Date(resume.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => input.current?.click()} aria-label="Replace resume" title="Replace" disabled={busy}>
                      <RefreshCw size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={remove} aria-label="Remove resume" title="Remove" className="hover:text-danger" disabled={busy}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs text-subtle">{resume.skills.length} skills detected</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {resume.skills.map((s) => (
                        <li key={s} className="inline-flex h-7 items-center rounded-md bg-surface-2 px-2 text-xs font-medium text-muted">
                          {s}
                        </li>
                      ))}
                      {resume.skills.length === 0 && <li className="text-sm text-muted">No known skills found. Is it a text-based PDF?</li>}
                    </ul>
                  </div>
                </Card>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) send(file);
                }}
                className={cn(
                  "relative flex flex-col items-center rounded-xl border border-dashed px-6 text-center transition-colors duration-150",
                  has ? "py-6" : "py-10",
                  dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:bg-surface-2/60",
                  busy && "pointer-events-none",
                )}
              >
                {busy ? <Spinner size={22} className="text-muted" /> : <UploadCloud size={22} className="text-subtle" />}
                <p className="mt-3 text-sm font-medium">{busy ? "Reading your resume…" : has ? "Drop a new version to replace it" : "Drop your resume PDF here"}</p>
                <p className="mt-1 text-xs text-subtle">Text-based PDF, up to 2 MB. It stays private to your account.</p>
                {!has && (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => input.current?.click()} disabled={busy}>
                    Choose file
                  </Button>
                )}
              </div>
              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) send(file);
                  e.target.value = "";
                }}
              />
              <FormError message={error} />
            </div>
          )}
        </Step>

        <Step n={2} title="Check it against a job">
          {has ? (
            <ResumeCheck />
          ) : (
            <p className="rounded-xl border border-border bg-surface-2/60 px-4 py-6 text-center text-sm text-subtle">
              Upload your resume first. Then paste any job link or description here.
            </p>
          )}
        </Step>
      </div>
    </div>
  );
}
