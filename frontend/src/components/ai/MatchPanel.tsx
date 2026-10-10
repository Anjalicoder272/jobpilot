"use client";

import { FileText, Gauge } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, post } from "@/lib/api";
import { atLeast } from "@/lib/utils";
import type { Application } from "@/lib/types";
import { SourceBadge } from "./AIBadge";
import ScoreRing from "./ScoreRing";
import SkillList from "./SkillList";

export default function MatchPanel({
  app,
  onUpdated,
  onEditDetails,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
  onEditDetails: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const hasResult = app.match_score !== null && app.match_source !== "";
  const hasJD = app.jd_text.trim().length >= 50;

  async function check() {
    setBusy(true);
    setError("");
    try {
      const updated = await atLeast(post<Application>(`/api/applications/${app.id}/match/`), 600);
      onUpdated(updated);
      toast({ title: `Match score: ${updated.match_score}%` });
    } catch (e) {
      setError(errorMessage(e, "Couldn't check the match."));
    } finally {
      setBusy(false);
    }
  }

  if (!hasJD) {
    return (
      <EmptyState
        icon={<FileText size={20} />}
        title="Add the job description first"
        description="Paste the description into the details tab. Then compare it against your resume in one click."
        action={
          <Button variant="secondary" onClick={onEditDetails}>
            Add job description
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {busy && !hasResult ? (
        <div className="flex items-center gap-5" aria-busy>
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ) : hasResult ? (
        <div className="animate-fade-up space-y-5">
          <div className="flex items-center gap-5">
            <ScoreRing score={app.match_score!} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold">Resume match</h3>
                <SourceBadge source={app.match_source} />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{app.match_summary}</p>
            </div>
          </div>
          <SkillList title="On your resume" skills={app.matched_skills} kind="have" empty="None detected yet." />
          <SkillList title="Missing or not shown" skills={app.missing_skills} kind="missing" empty="Nothing important missing." />
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-4">
          <Gauge size={18} className="mt-0.5 shrink-0 text-subtle" />
          <p className="text-sm text-muted">
            See how well your <Link href="/job-match" className="font-medium text-text underline underline-offset-4">resume</Link> fits
            this job, which skills you already show, and what&apos;s missing.
          </p>
        </div>
      )}

      <FormError message={error} />

      <div className="flex flex-wrap gap-2">
        <Button variant={hasResult ? "secondary" : "primary"} onClick={check} loading={busy}>
          <Gauge size={15} /> {hasResult ? "Check again" : "Check match"}
        </Button>
      </div>
    </div>
  );
}
