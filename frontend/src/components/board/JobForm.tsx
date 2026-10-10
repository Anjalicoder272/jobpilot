"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";
import { Field, PrimaryButton, inputClass } from "../ui/Field";

export type JobFormValues = Pick<
  Application,
  "company" | "role" | "location" | "job_url" | "hr_name" | "hr_email" | "notes" | "jd_text"
> & { follow_up_on: string };

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function JobForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<Application>;
  submitLabel: string;
  onSubmit: (values: JobFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<JobFormValues>({
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    location: initial?.location ?? "",
    job_url: initial?.job_url ?? "",
    hr_name: initial?.hr_name ?? "",
    hr_email: initial?.hr_email ?? "",
    notes: initial?.notes ?? "",
    jd_text: initial?.jd_text ?? "",
    // New applications get a follow-up reminder 5 days from now.
    follow_up_on: initial ? initial.follow_up_on ?? "" : inDays(5),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof JobFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues({ ...values, [key]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company *">
          <input className={inputClass} required value={values.company} onChange={set("company")} placeholder="e.g. OLX" />
        </Field>
        <Field label="Role *">
          <input className={inputClass} required value={values.role} onChange={set("role")} placeholder="Frontend Developer" />
        </Field>
        <Field label="Location">
          <input className={inputClass} value={values.location} onChange={set("location")} placeholder="Noida / Remote" />
        </Field>
        <Field label="Follow up on">
          <input className={inputClass} type="date" value={values.follow_up_on} onChange={set("follow_up_on")} />
        </Field>
        <Field label="HR name">
          <input className={inputClass} value={values.hr_name} onChange={set("hr_name")} />
        </Field>
        <Field label="HR email">
          <input className={inputClass} type="email" value={values.hr_email} onChange={set("hr_email")} />
        </Field>
      </div>
      <Field label="Job link">
        <input className={inputClass} type="url" value={values.job_url} onChange={set("job_url")} placeholder="https://" />
      </Field>
      <Field label="Job description" hint="Paste it here. Later it powers your resume match score.">
        <textarea className={`${inputClass} min-h-28`} value={values.jd_text} onChange={set("jd_text")} />
      </Field>
      <Field label="Notes">
        <textarea className={`${inputClass} min-h-20`} value={values.notes} onChange={set("notes")} />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-[#f43f5e]/10 px-3 py-2 text-sm text-[#e11d48]">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={busy} className="w-full py-3">
        {busy ? "Saving…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}
