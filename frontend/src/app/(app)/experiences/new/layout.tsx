import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Share your interview experience",
  description: "Share the questions you were asked.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
