"use client";

import { CheckCircle2, FileText, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAIStatus } from "@/components/ai/AIBadge";
import ResumeCheck from "@/components/ai/ResumeCheck";
import Reveal from "@/components/Reveal";
import { GhostButton } from "@/components/ui/Field";
import { api, del, upload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ResumeInfo } from "@/lib/types";

export default function JobMatchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ai = useAIStatus();
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) api<ResumeInfo>("/api/resume/").then(setResume).catch(() => {});
  }, [loading, user, router]);

  async function send(file: File) {
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setError("Please choose a PDF file.");
    if (file.size > 2 * 1024 * 1024) return setError("The file is larger than 2 MB.");
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      setResume(await upload<ResumeInfo>("/api/resume/", form));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remove your resume?")) return;
    await del("/api/resume/");
    setResume({ filename: "", skills: [], characters: 0, uploaded_at: null, has_resume: false });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Reveal>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Job match</h1>
        <p className="mt-1 text-sm text-muted">
          Find out if your resume is ready for a job, and exactly what to add if it isn&apos;t.
        </p>
      </Reveal>

      {/* AI status */}
      <Reveal delay={60}>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />
          {ai === null ? (
            <span className="text-muted">Checking AI status…</span>
          ) : ai.enabled ? (
            <span>
              <b>AI is on</b> ({ai.provider === "gemini" ? "Google Gemini" : "Claude"}). Match scores and emails are
              written by AI, based only on your resume.
            </span>
          ) : (
            <span>
              <b>Basic mode.</b> Matching uses a built-in skill detector and emails use a template. Add a{" "}
              <code className="rounded bg-surface px-1">GEMINI_API_KEY</code> (free) or{" "}
              <code className="rounded bg-surface px-1">ANTHROPIC_API_KEY</code> to <code className="rounded bg-surface px-1">backend/.env</code>{" "}
              to turn on AI.
            </span>
          )}
        </div>
      </Reveal>

      {/* Step 1: upload */}
      <Reveal delay={100}>
        <h2 className="mt-8 flex items-center gap-2 font-display text-lg font-bold">
          <span className="bg-gradient-brand grid h-7 w-7 place-items-center rounded-full text-sm text-white">1</span>
          Add your resume
          {resume?.has_resume && <span className="text-sm font-normal text-muted">(done ✓, upload again to replace it)</span>}
        </h2>
      </Reveal>
      <Reveal delay={120}>
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
          className={`mt-3 rounded-3xl border-2 border-dashed p-10 text-center transition ${
            dragging ? "scale-[1.01] border-brand bg-brand-soft" : "border-border bg-surface"
          }`}
        >
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand ${busy ? "animate-pulse" : "float"}`}>
            <UploadCloud size={30} />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">
            {busy ? "Reading your resume…" : resume?.has_resume ? "Upload a new version" : "Drop your resume here"}
          </h2>
          <p className="mt-1 text-sm text-muted">PDF only, up to 2 MB. Text-based PDFs work best.</p>
          <button
            onClick={() => input.current?.click()}
            disabled={busy}
            className="press bg-gradient-brand mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
          >
            <FileText size={16} /> Choose PDF
          </button>
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
          {error && <p role="alert" className="mt-4 text-sm text-[#e11d48]">{error}</p>}
        </div>
      </Reveal>

      {/* Current resume */}
      {resume?.has_resume && (
        <div className="pop-in mt-6 rounded-3xl border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="text-[#10b981]" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{resume.filename}</div>
              <div className="text-xs text-muted">
                {resume.characters.toLocaleString()} characters read
                {resume.uploaded_at && ` · uploaded ${new Date(resume.uploaded_at).toLocaleDateString("en-IN")}`}
              </div>
            </div>
            <GhostButton onClick={remove} className="text-[#e11d48]">
              <Trash2 size={16} /> Remove
            </GhostButton>
          </div>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">
            Skills detected ({resume.skills.length})
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {resume.skills.map((skill, i) => (
              <span
                key={skill}
                className="pop-in rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {skill}
              </span>
            ))}
            {resume.skills.length === 0 && <span className="text-sm text-muted">No known skills detected.</span>}
          </div>
        </div>
      )}

      {resume?.has_resume && <ResumeCheck />}
    </div>
  );
}
