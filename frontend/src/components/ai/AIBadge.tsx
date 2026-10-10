"use client";

import { Cpu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { AIStatus } from "@/lib/types";

let cached: Promise<AIStatus> | null = null;

export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  useEffect(() => {
    cached ??= api<AIStatus>("/api/ai/status/").catch(() => {
      cached = null;
      return { enabled: false, provider: null, model: "" };
    });
    cached.then(setStatus);
  }, []);
  return status;
}

/** Says honestly whether a result came from AI or from the built-in matcher. */
export function SourceBadge({ source }: { source: "ai" | "basic" | "" }) {
  if (!source) return null;
  return source === "ai" ? (
    <Badge tone="accent">
      <Sparkles size={12} /> AI
    </Badge>
  ) : (
    <Badge>
      <Cpu size={12} /> Basic match
    </Badge>
  );
}
