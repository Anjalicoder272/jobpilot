import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job match",
  description: "Check your resume against any job.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
