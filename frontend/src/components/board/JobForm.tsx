"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import type { Application } from "@/lib/types";

export type JobFormValues = Pick<
  Application,
  "company" | "role" | "location" | "job_url" | "hr_name" | "hr_email" | "notes" | "jd_text" | "applied_on"
> & { follow_up_on: string };

const today = () => new Date().toLocaleDateString("en-CA");

export function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

type Errors = Partial<Record<keyof JobFormValues, string>>;

function validate(v: JobFormValues): Errors {
  const e: Errors = {};
  if (!v.company.trim()) e.company = "Enter the company.";
  if (!v.role.trim()) e.role = "Enter the role.";
  if (v.job_url && !/^https?:\/\/\S+\.\S+/.test(v.job_url.trim())) e.job_url = "Use a full link starting with https://";
  if (v.hr_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.hr_email.trim())) e.hr_email = "Enter a valid email.";
  if (v.follow_up_on && v.applied_on && v.follow_up_on < v.applied_on) e.follow_up_on = "Can't be before the applied date.";
  return e;
}

export default function JobForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Application>;
  submitLabel: string;
  onSubmit: (values: JobFormValues) => Promise<void>;
  onCancel?: () => void;
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
    applied_on: initial?.applied_on ?? today(),
    follow_up_on: initial ? initial.follow_up_on ?? "" : inDays(5),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (key: keyof JobFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    setDirty(true);
    if (errors[key]) setErrors(validate(next));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError("");
    try {
      await onSubmit({ ...values, company: values.company.trim(), role: values.role.trim(), job_url: values.job_url.trim() });
      setDirty(false);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="sr-only">Job</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" required error={errors.company}>
            <Input value={values.company} onChange={set("company")} placeholder="e.g. Razorpay" maxLength={120} data-autofocus />
          </Field>
          <Field label="Role" required error={errors.role}>
            <Input value={values.role} onChange={set("role")} placeholder="e.g. Frontend Engineer" maxLength={150} />
          </Field>
          <Field label="Location" optional>
            <Input value={values.location} onChange={set("location")} placeholder="Bengaluru · Remote" maxLength={120} />
          </Field>
          <Field label="Job link" optional error={errors.job_url}>
            <Input type="url" inputMode="url" value={values.job_url} onChange={set("job_url")} placeholder="https://" maxLength={500} />
          </Field>
          <Field label="Applied on">
            <Input type="date" value={values.applied_on} onChange={set("applied_on")} max={today()} />
          </Field>
          <Field label="Remind me to follow up" optional error={errors.follow_up_on}>
            <Input type="date" value={values.follow_up_on} onChange={set("follow_up_on")} min={values.applied_on} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className="float-left mb-4 text-[13px] font-medium text-subtle">Recruiter</legend>
        <div className="clear-left grid gap-4 sm:grid-cols-2">
          <Field label="Name" optional>
            <Input value={values.hr_name} onChange={set("hr_name")} placeholder="e.g. Neha" maxLength={120} />
          </Field>
          <Field label="Email" optional error={errors.hr_email}>
            <Input type="email" inputMode="email" value={values.hr_email} onChange={set("hr_email")} placeholder="neha@company.com" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-5">
        <legend className="sr-only">Details</legend>
        <Field label="Job description" optional hint="Paste it to unlock the resume match score and a tailored prep plan.">
          <Textarea
            value={values.jd_text}
            onChange={set("jd_text")}
            rows={6}
            maxLength={20000}
            placeholder="Paste the full job description here"
          />
        </Field>
        <Field label="Notes" optional>
          <Textarea value={values.notes} onChange={set("notes")} rows={3} maxLength={5000} placeholder="Referral, salary range, anything to remember" />
        </Field>
      </fieldset>

      <FormError message={formError} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy} disabled={initial && !dirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
