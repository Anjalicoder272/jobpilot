"use client";

import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, post } from "@/lib/api";
import { atLeast } from "@/lib/utils";
import type { Application, EmailDraft } from "@/lib/types";
import { SourceBadge } from "./AIBadge";

/** Drafts an email the user edits and sends from their own inbox. JobPilot never sends it. */
export default function EmailDraftModal({ app, open, onClose }: { app: Application; open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDraft(await atLeast(post<EmailDraft>(`/api/applications/${app.id}/email/`), 500));
    } catch (e) {
      setError(errorMessage(e, "Couldn't write the email."));
    } finally {
      setLoading(false);
    }
  }, [app.id]);

  useEffect(() => {
    if (open && !draft) generate();
  }, [open, draft, generate]);

  async function copyAll() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast({ title: "Email copied" });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it manually.", tone: "error" });
    }
  }

  const gmailUrl = draft
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(draft.to)}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Email to ${app.company}`}
      description="Written only from facts in your resume. Edit freely, then send from your own inbox."
      size="lg"
      footer={
        draft && !loading ? (
          <>
            <Button variant="ghost" onClick={generate} className="mr-auto">
              <RefreshCw size={15} /> Rewrite
            </Button>
            <Button variant="secondary" onClick={copyAll}>
              {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
            </Button>
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
              Open in Gmail <ExternalLink size={14} />
            </a>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-4" aria-busy aria-label="Writing your email">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10" />
          <Skeleton className="h-56" />
        </div>
      ) : error ? (
        <div className="space-y-4">
          <FormError message={error} />
          <Button variant="secondary" onClick={generate}>
            Try again
          </Button>
        </div>
      ) : (
        draft && (
          <div className="animate-fade-up space-y-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted">
                To: {draft.to || <span className="text-warning">add the HR email in the details tab</span>}
              </span>
              <SourceBadge source={draft.source} />
            </div>
            <Field label="Subject">
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </Field>
            <Field label="Message" hint="Add your resume link before sending.">
              <Textarea rows={12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </Field>
          </div>
        )
      )}
    </Dialog>
  );
}
