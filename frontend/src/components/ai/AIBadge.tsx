"use client";

import { Cpu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AIStatus } from "@/lib/types";

let cached: Promise<AIStatus> | null = null;
export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  useEffect(() => {
    cached ??= api<AIStatus>("/api/ai/status/");
    cached.then(setStatus).catch(() => setStatus({ enabled: false, provider: null, model: "" }));
  }, []);
  return status;
}

/** Small pill that says honestly whether a result came from AI or from the basic matcher. */
export function SourceBadge({ source }: { source: "ai" | "basic" | "" }) {
  if (!source) return null;
  return source === "ai" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
      <Sparkles size={12} /> AI
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
      <Cpu size={12} /> Basic match
    </span>
  );
}
