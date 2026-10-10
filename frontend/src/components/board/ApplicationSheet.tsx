"use client";

import { BellRing, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import EmailDraftModal from "@/components/ai/EmailDraftModal";
import MatchPanel from "@/components/ai/MatchPanel";
import PrepPanel from "@/components/ai/PrepPanel";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { COLUMNS, type Application, type Status } from "@/lib/types";
import { safeHref } from "@/lib/utils";
import JobForm, { inDays, type JobFormValues } from "./JobForm";
import { MatchPill } from "./JobCard";

type Tab = "details" | "match" | "prep";

export default function ApplicationSheet({
  app,
  onClose,
  onSave,
  onMove,
  onDelete,
  onUpdated,
}: {
  app: Application | null;
  onClose: () => void;
  onSave: (app: Application, values: Partial<JobFormValues>) => Promise<void>;
  onMove: (app: Application, status: Status) => void;
  onDelete: (app: Application) => void;
  onUpdated: (app: Application) => void;
}) {
  const [shown, setShown] = useState<Application | null>(app);
  const [tab, setTab] = useState<Tab>("details");
  const [emailOpen, setEmailOpen] = useState(false);
  const [snoozing, setSnoozing] = useState(false);

  useEffect(() => {
    if (!app) return;
    if (app.id !== shown?.id) setTab(app.status === "INTERVIEW" || app.status === "OFFER" ? "prep" : "details");
    setShown(app);
  }, [app, shown?.id]);

  if (!shown) return null;
  const preparing = shown.status === "INTERVIEW" || shown.status === "OFFER";
  const followUp = shown.is_follow_up_due && (shown.status === "APPLIED" || shown.status === "HR_REPLIED");
  const jobLink = safeHref(shown.job_url);

  async function snooze() {
    setSnoozing(true);
    try {
      await onSave(shown!, { follow_up_on: inDays(5) });
    } finally {
      setSnoozing(false);
    }
  }

  const tabs: { value: Tab; label: string; badge?: React.ReactNode }[] = [
    { value: "details", label: "Details" },
    { value: "match", label: "Resume match", badge: shown.match_score !== null ? <MatchPill score={shown.match_score} /> : undefined },
  ];
  if (preparing) tabs.push({ value: "prep", label: "Interview prep" });

  return (
    <>
      <Dialog
        open={!!app}
        onClose={onClose}
        variant="sheet"
        title={shown.role}
        description={[shown.company, shown.location].filter(Boolean).join(" · ")}
        initialFocus="none"
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="stage-select">
            Stage
          </label>
          <Select
            id="stage-select"
            value={shown.status}
            onChange={(e) => onMove(shown, e.target.value as Status)}
            className="h-9 max-w-44 pointer-coarse:h-11"
          >
            {COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.label}
              </option>
            ))}
          </Select>
          {jobLink && (
            <a href={jobLink} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "secondary", size: "sm", className: "h-9" })}>
              Job post <ExternalLink size={13} />
            </a>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(shown)} aria-label="Delete application" title="Delete" className="ml-auto text-subtle hover:text-danger">
            <Trash2 size={16} />
          </Button>
        </div>

        {followUp && (
          <div className="animate-fade-up mt-4 flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning-soft p-3.5 sm:flex-row sm:items-center">
            <BellRing size={16} className="shrink-0 text-warning" />
            <p className="flex-1 text-sm">
              <span className="font-medium">Time to follow up.</span>{" "}
              <span className="text-muted">A short, polite nudge often gets a reply.</span>
            </p>
            <Button size="sm" variant="secondary" onClick={snooze} loading={snoozing}>
              I followed up
            </Button>
          </div>
        )}

        <Tabs value={tab} onChange={setTab} tabs={tabs} label="Application sections" className="mt-5" />

        <div className="pt-5" role="tabpanel">
          {tab === "details" && (
            <JobForm key={`${shown.id}-${shown.updated_at}`} initial={shown} submitLabel="Save changes" onSubmit={(v) => onSave(shown, v)} />
          )}
          {tab === "match" && (
            <MatchPanel app={shown} onUpdated={onUpdated} onWriteEmail={() => setEmailOpen(true)} onEditDetails={() => setTab("details")} />
          )}
          {tab === "prep" && preparing && <PrepPanel app={shown} />}
        </div>
      </Dialog>
      <EmailDraftModal key={shown.id} app={shown} open={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  );
}
