import { ArrowRight, Check, FileCheck2, Lock, Tags } from "lucide-react";
import type { Metadata } from "next";
import DemoBoard from "@/components/landing/DemoBoard";
import Parallax from "@/components/landing/Parallax";
import { MatchPreview, PrepPreview, TrackPreview } from "@/components/landing/Previews";
import Reveal from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  alternates: { canonical: "/" },
};

const STORIES = [
  {
    id: "track",
    eyebrow: "Track",
    title: "Every application in one place, with a nudge when it goes quiet",
    text: "Add a job in seconds and move it from Applied to Offer as things happen. JobPilot shows your response rate and reminds you when it's time to follow up.",
    points: ["Drag and drop, or change the stage from any device", "Follow-up reminders on the dates you choose", "Search and filter across every application"],
    Preview: TrackPreview,
  },
  {
    id: "match",
    eyebrow: "Match",
    title: "Know if your resume fits before you hit apply",
    text: "Paste a job link or description. You get a match score, the skills you already show, what's missing, and specific edits to make.",
    points: ["Works with most job boards and careers pages", "Suggestions never ask you to claim skills you don't have", "Draft a cold email to HR from facts on your resume"],
    Preview: MatchPreview,
  },
  {
    id: "prepare",
    eyebrow: "Prepare",
    title: "A prep plan built from what this company actually asks",
    text: "When a card reaches Interview, get focus topics, a three-day checklist and likely questions, drawn from experiences other candidates shared.",
    points: ["Real questions are labelled as real, suggestions as suggestions", "Links to first-hand posts on LeetCode, Glassdoor and Reddit", "Tick off tasks as you go"],
    Preview: PrepPreview,
  },
];

const TRUST = [
  { icon: FileCheck2, title: "Grounded in your resume", text: "Match results and emails only use facts that appear in your own resume. Nothing is invented." },
  { icon: Tags, title: "Honest labels", text: "Every question shows where it came from: asked at that company, reported online, or a suggestion." },
  { icon: Lock, title: "Private by default", text: "Your board and resume are visible only to you. Shared experiences hide emails, phone numbers and last names." },
];

const STEPS = [
  { title: "Add a job", text: "Company and role are enough. Paste the description to unlock matching." },
  { title: "Check your fit", text: "See your match score and what to add before you apply." },
  { title: "Prepare and land it", text: "Follow the plan, practise real questions, move the card to Offer." },
];

const FAQ = [
  {
    q: "Is JobPilot free?",
    a: "Yes. Tracking applications, resume matching and interview prep are free while JobPilot is in beta. No card needed.",
  },
  {
    q: "Who can see my resume and applications?",
    a: "Only you. Your board, resume and match results are private to your account. Interview experiences you choose to share are public, with only your first name shown.",
  },
  {
    q: "Where do the interview questions come from?",
    a: "From candidates who share their experiences on JobPilot, and from public posts on sites like LeetCode, Glassdoor and Reddit, which we link to rather than copy. Each question is labelled with its source.",
  },
  {
    q: "Does the AI make things up?",
    a: "It is instructed to use only facts from your resume and the job description, and results are labelled when they come from AI. Real questions are only marked as real when they were actually shared for that company.",
  },
  {
    q: "Which job links can I paste?",
    a: "Most careers pages and job boards that publish standard job data. Some sites, like LinkedIn, block automatic reading; for those, paste the description instead.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden">
        <Parallax aria-hidden speed={140} className="pointer-events-none absolute inset-x-0 top-0 h-[720px]">
          <div className="bg-grid h-full" />
        </Parallax>
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-24">
          <Parallax speed={-70} fadeOut className="mx-auto max-w-3xl">
          <div className="stagger text-center">
            <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
              Your job search,{" "}
              <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.01em]">finally organised.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Track every application on one board, check your resume against any job before you apply, and prepare with
              questions real candidates were asked.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
              <ButtonLink href="/signup" size="lg" className="shine nudge">
                Get started free <ArrowRight size={16} />
              </ButtonLink>
              <ButtonLink href="/experiences" size="lg" variant="secondary">
                Browse interview questions
              </ButtonLink>
            </div>
          </div>
          </Parallax>

          <Parallax speed={40} scaleFrom={0.94} className="mx-auto mt-14 max-w-4xl origin-top sm:mt-16">
            <Reveal delay={150}>
              <DemoBoard />
            </Reveal>
          </Parallax>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-accent-text">Features</p>
            <h2 id="features-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.1]">
              From first application to final round
            </h2>
            <p className="mt-4 text-muted">
              Three tools that work together, so you stop juggling spreadsheets, job portals and scattered notes.
            </p>
          </Reveal>

          <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
            {STORIES.map(({ id, eyebrow, title, text, points, Preview }, i) => (
              <div key={id} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <Reveal className={i % 2 ? "md:order-2" : ""}>
                  <p className="text-sm font-medium text-subtle">
                    <span className="tabular text-text">0{i + 1}</span> · {eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-tight">{title}</h3>
                  <p className="mt-4 leading-relaxed text-muted">{text}</p>
                  <ul className="mt-6 space-y-3">
                    {points.map((p) => (
                      <li key={p} className="flex gap-3 text-sm">
                        <Check size={16} className="mt-0.5 shrink-0 text-success" /> {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Parallax speed={-60} className={i % 2 ? "md:order-1" : ""}>
                  <Reveal delay={120}>
                    <Preview />
                  </Reveal>
                </Parallax>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="trust-title" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal className="max-w-2xl">
            <h2 id="trust-title" className="text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.1]">
              Built to be trusted with your job search
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={i * 80} className="h-full">
                <div className="h-full bg-surface p-6 sm:p-8">
                  <t.icon size={20} className="text-text" />
                  <h3 className="mt-5 font-semibold">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <Reveal>
            <h2 id="how-title" className="text-3xl font-semibold tracking-tight sm:text-[40px]">
              How it works
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <li className="border-t border-border-strong pt-5">
                  <span className="tabular font-mono text-xs text-subtle">0{i + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 md:grid-cols-[1fr_2fr]">
          <Reveal>
            <h2 id="faq-title" className="text-3xl font-semibold tracking-tight sm:text-[40px]">
              Questions
            </h2>
            <p className="mt-3 text-sm text-muted">Everything you might want to know before you start.</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="divide-y divide-border border-y border-border">
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="relative h-3 w-3 shrink-0 text-subtle">
                      <span className="absolute left-0 top-1/2 h-px w-3 bg-current" />
                      <span className="absolute left-1/2 top-0 h-3 w-px bg-current transition-transform duration-200 group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <Reveal className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-on-primary sm:py-20">
            <Parallax aria-hidden speed={80} className="pointer-events-none absolute inset-0 opacity-[0.07]">
              <div className="bg-grid h-full [--border:currentColor] [mask-image:none]" />
            </Parallax>
            <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.1]">
              Your next offer starts with a clear board.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-on-primary/70">Set it up in under a minute. Free while in beta.</p>
            <ButtonLink href="/signup" size="lg" variant="secondary" className="relative mt-8 border-transparent">
              Create your free board <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </>
  );
}
