"use client";

import { Gauge, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { post } from "@/lib/api";
import type { Application } from "@/lib/types";
import { SourceBadge } from "./AIBadge";
import ScoreRing from "./ScoreRing";

/** Shown inside a card's drawer: resume match score, matched/missing skills, and the email button. */
export default function MatchPanel({
  app,
  onUpdated,
  onWriteEmail,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
  onWriteEmail: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasResult = app.match_score !== null && app.match_source !== "";

  async function check() {
    setBusy(true);
    setError("");
    try {
      onUpdated(await post<Application>(`/api/applications/${app.id}/match/`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check the match");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-3xl border border-border bg-surface-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <Gauge size={18} className="text-brand" /> Resume match
        </h3>
        <SourceBadge source={app.match_source} />
      </div>

      {hasResult ? (
        <div className="pop-in mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
          <ScoreRing score={app.match_score!} />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm leading-relaxed">{app.match_summary}</p>
            {app.matched_skills.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold text-muted">You have</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.matched_skills.map((s) => (
                    <span key={s} className="rounded-full bg-[#10b981]/15 px-2.5 py-0.5 text-xs font-semibold text-[#059669]">✓ {s}</span>
                  ))}
                </div>
              </div>
            )}
            {app.missing_skills.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold text-muted">Missing or not shown</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.missing_skills.map((s) => (
                    <span key={s} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Paste the job description below and save, then check how well your{" "}
          <Link href="/job-match" className="font-semibold text-brand">resume</Link> fits this job.
        </p>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-[#e11d48]">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={check}
          disabled={busy}
          className="press bg-gradient-brand inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-60"
        >
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          {busy ? "Checking…" : hasResult ? "Check again" : "Check match"}
        </button>
        <button
          onClick={onWriteEmail}
          className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold"
        >
          <Mail size={15} /> Write email to HR
        </button>
      </div>
    </div>
  );
}
