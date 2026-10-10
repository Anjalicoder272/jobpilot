"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, PasswordInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

type Mode = "login" | "signup";
type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(mode: Mode, v: Values): Errors {
  const e: Errors = {};
  if (mode === "signup" && !v.name.trim()) e.name = "Enter your name.";
  if (!v.email.trim()) e.email = "Enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email, like name@example.com.";
  if (!v.password) e.password = "Enter your password.";
  else if (mode === "signup" && v.password.length < 8) e.password = "Use at least 8 characters.";
  return e;
}

// Keeps the spinner up long enough to read as feedback instead of a flicker on fast errors.
const atLeast = <T,>(promise: Promise<T>, ms = 450) =>
  Promise.allSettled([promise, new Promise((r) => setTimeout(r, ms))]).then(([result]) =>
    result.status === "fulfilled" ? result.value : Promise.reject(result.reason),
  );

export default function AuthForm({ mode }: { mode: Mode }) {
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const next = safeNext(params.get("next"));
  const isSignup = mode === "signup";

  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && user && !busy) router.replace(next);
  }, [loading, user, busy, next, router]);

  function update(key: keyof Values) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = { ...values, [key]: e.target.value };
      setValues(v);
      if (submitted) setErrors(validate(mode, v));
      if (formError) setFormError("");
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(mode, values);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`auth-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const email = values.email.trim().toLowerCase();
      await atLeast(isSignup ? signup(values.name.trim(), email, values.password) : login(email, values.password));
      toast({ title: isSignup ? "Welcome to JobPilot" : "Welcome back", description: isSignup ? "Your board is ready." : undefined });
      router.replace(next);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="animate-fade-up">
        <h1 className="text-[26px] font-semibold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup ? "Free, and takes under a minute. No card needed." : "Log in to pick up where you left off."}
        </p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="animate-fade-up mt-7 space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm [animation-delay:60ms] sm:p-7"
      >
        {isSignup && (
          <Field label="Full name" error={errors.name}>
            <Input
              id="auth-name"
              value={values.name}
              onChange={update("name")}
              autoComplete="name"
              placeholder="Aditya Dixit"
              maxLength={80}
              disabled={busy}
            />
          </Field>
        )}
        <Field label="Email" error={errors.email}>
          <Input
            id="auth-email"
            type="email"
            inputMode="email"
            value={values.email}
            onChange={update("email")}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            maxLength={254}
            disabled={busy}
          />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          hint={isSignup ? "At least 8 characters. Avoid your name or email." : undefined}
        >
          <PasswordInput
            id="auth-password"
            value={values.password}
            onChange={update("password")}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "Create a password" : "Your password"}
            maxLength={128}
            disabled={busy}
          />
        </Field>

        <FormError message={formError} />

        <Button type="submit" size="lg" loading={busy} className="w-full">
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </form>

      <p className="animate-fade-up mt-6 text-center text-sm text-muted [animation-delay:120ms]">
        {isSignup ? "Already have an account?" : "New to JobPilot?"}{" "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-text underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-text"
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
      {isSignup && (
        <p className="mt-3 text-center text-xs text-subtle">
          Your resume and applications are private to your account.
        </p>
      )}
    </div>
  );
}
