import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Create a free JobPilot board to track applications, match your resume and prepare for interviews.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
