import type { Metadata } from "next";
import { Suspense } from "react";
import { serverGet } from "@/lib/server-api";
import type { Experience, Page, TopicCount } from "@/lib/types";
import ExperiencesFeed from "./ExperiencesFeed";

type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const company = one((await searchParams).company);
  if (company) {
    const name = titleCase(company);
    return {
      title: `${name} interview experiences and questions`,
      description: `Real ${name} interview questions and round-by-round experiences shared by candidates on JobPilot.`,
      alternates: { canonical: `/experiences?company=${encodeURIComponent(company)}` },
    };
  }
  return {
    title: "Interview experiences and real questions",
    description:
      "Real interview questions from software engineering candidates, by company, level and topic: JavaScript, React, DSA, system design and more.",
    alternates: { canonical: "/experiences" },
  };
}

export default async function ExperiencesPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const filters = {
    company: one(params.company),
    level: one(params.level),
    topic: one(params.topic),
    search: one(params.search).slice(0, 200),
    smart: one(params.smart) === "1",
  };
  const query = new URLSearchParams();
  for (const k of ["company", "level", "topic", "search"] as const) if (filters[k]) query.set(k, filters[k]);

  // Smart search spends a paid API call per request, so only plain listings are rendered on the server.
  const [initial, topics] = filters.smart
    ? [null, null]
    : await Promise.all([
        serverGet<Page<Experience>>(`/api/experiences/?${query}`),
        serverGet<TopicCount[]>(`/api/experiences/topics/${filters.company ? `?company=${encodeURIComponent(filters.company)}` : ""}`),
      ]);

  return (
    <Suspense>
      <ExperiencesFeed initial={initial} initialTopics={topics} initialKey={`${filters.company}|${filters.level}|${filters.topic}|${filters.search}|${filters.smart}`} />
    </Suspense>
  );
}
