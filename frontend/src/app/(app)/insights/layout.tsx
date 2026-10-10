import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company insights",
  description: "Interview insights for any company and role.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
