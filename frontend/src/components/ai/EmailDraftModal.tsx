"use client";

import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { post } from "@/lib/api";
import type { Application, EmailDraft } from "@/lib/types";
import Modal from "../board/Modal";
import { Field, inputClass } from "../ui/Field";
import { SourceBadge } from "./AIBadge";

/** Generates an email draft the user can edit, copy, or open in Gmail. JobPilot never sends it itself. */
export default function EmailDraftModal({ app, onClose }: { app: Application; onClose: () => void }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDraft(await post<EmailDraft>(`/api/applications/${app.id}/email/`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write the email");
    } finally {
      setLoading(false);
    }
  }, [app.id]);

  useEffect(() => {
    generate();
  }, [generate]);

  async function copyAll() {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const gmailUrl = draft
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(draft.to)}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : "#";

  return (
    <Modal title={`Email for ${app.company}`} onClose={onClose}>
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-10" />
          <div className="skeleton h-64" />
          <p className="text-center text-sm text-muted">Writing your email from your resume…</p>
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-[#e11d48]">{error}</p>
      ) : (
        draft && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">To: {draft.to || "add the HR email on the card"}</span>
              <SourceBadge source={draft.source} />
            </div>
            <Field label="Subject">
              <input className={inputClass} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </Field>
            <Field label="Message" hint="Edit anything you like. Add your resume link before sending.">
              <textarea
                className={`${inputClass} min-h-72 leading-relaxed`}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <a
                href={gmailUrl}
                target="_blank"
                rel="noreferrer"
                className="press bg-gradient-brand inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-card"
              >
                <ExternalLink size={16} /> Open in Gmail
              </a>
              <button onClick={copyAll} className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold">
                {copied ? <Check size={16} className="text-[#10b981]" /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={generate} className="press inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold">
                <RefreshCw size={16} /> Rewrite
              </button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
