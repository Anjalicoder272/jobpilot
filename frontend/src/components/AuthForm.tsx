"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "./Logo";
import Reveal from "./Reveal";
import { Field, PrimaryButton, inputClass } from "./ui/Field";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isSignup) await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
      router.push("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden px-4 py-12">
      <div className="blob float left-[10%] top-[10%] h-64 w-64 blob-1" />
      <div className="blob float bottom-[5%] right-[10%] h-64 w-64 blob-2" style={{ animationDelay: "-3s" }} />
      <Reveal className="relative w-full max-w-md">
        <form onSubmit={submit} className="glow-border rounded-3xl border border-border bg-surface p-8 shadow-pop">
          <div className="mb-5"><LogoMark size={44} /></div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {isSignup ? "Create your board" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isSignup ? "Start tracking your applications in a minute." : "Log in to see your board."}
          </p>
          <div className="mt-6 space-y-4">
            {isSignup && (
              <Field label="Full name">
                <input className={inputClass} required value={form.name} autoComplete="name"
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            )}
            <Field label="Email">
              <input className={inputClass} type="email" required value={form.email} autoComplete="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password" hint={isSignup ? "At least 8 characters." : undefined}>
              <input className={inputClass} type="password" required minLength={8} value={form.password}
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#f43f5e]/10 px-3 py-2 text-sm text-[#e11d48]">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={busy} className="mt-6 w-full py-3">
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </PrimaryButton>
          <p className="mt-5 text-center text-sm text-muted">
            {isSignup ? "Already have an account? " : "New to JobPilot? "}
            <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-brand">
              {isSignup ? "Log in" : "Create one"}
            </Link>
          </p>
        </form>
      </Reveal>
    </div>
  );
}
