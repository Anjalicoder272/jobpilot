import { ArrowRight, BellRing, BookOpenCheck, KanbanSquare, Sparkles, Target, Users } from "lucide-react";
import Link from "next/link";
import CountUp from "@/components/fx/CountUp";
import RotatingWords from "@/components/fx/RotatingWords";
import Spotlight from "@/components/fx/Spotlight";
import DemoBoard from "@/components/landing/DemoBoard";
import HeroGlow from "@/components/landing/HeroGlow";
import Reveal from "@/components/Reveal";

const FEATURES = [
  { icon: KanbanSquare, title: "One board for every application", text: "Drag each job from Applied to HR Replied, Interview and Offer. No more spreadsheets and lost emails.", color: "#3b82f6" },
  { icon: Target, title: "Resume match score", text: "Paste a job description and see how well your resume fits, plus the skills you are missing.", color: "#0d9488" },
  { icon: Sparkles, title: "AI cold emails, grounded in your resume", text: "Write a tailored email to HR in seconds. It only uses facts from your own resume, so nothing is made up.", color: "#8b5cf6" },
  { icon: BellRing, title: "Follow-up reminders", text: "Get nudged when an HR has not replied in a few days, so no opportunity goes cold.", color: "#f97316" },
  { icon: Users, title: "Real interview experiences", text: "Read what candidates were actually asked, filtered by company, level and topic.", color: "#10b981" },
  { icon: BookOpenCheck, title: "Prep for the exact interview", text: "When a card reaches Interview, see the most-asked topics for that company and a prep plan.", color: "#f43f5e" },
];

const STEPS = [
  { n: "01", title: "Add a job", text: "Company, role and the job description. Takes ten seconds." },
  { n: "02", title: "Track it", text: "Move the card as HR replies and interviews get scheduled." },
  { n: "03", title: "Prepare", text: "Study the questions real candidates were asked at that company." },
];

const TOPICS = ["React hooks", "Event loop", "Debounce", "Core Web Vitals", "SSR vs SSG", "Closures", "Rate limiter", "JWT auth", "CSS specificity", "Promises", "System design", "Redis caching", "LRU cache", "Infinite scroll"];

const STATS = [
  { value: 5, suffix: "", label: "stages on your board" },
  { value: 9, suffix: "", label: "interview topics tracked" },
  { value: 100, suffix: "%", label: "free while in beta" },
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <HeroGlow />
        <div className="blob float left-[-6rem] top-0 h-72 w-72 blob-1" />
        <div className="blob float right-[-4rem] top-24 h-80 w-80 blob-2" style={{ animationDelay: "-3s" }} />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal delay={80}>
              <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
                Land your next role with a <br className="hidden sm:block" />
                <RotatingWords words={["co-pilot", "head start", "clear board"]} />
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
                Track every application on one board, match your resume to each job, and prepare with real interview
                experiences from other candidates.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="press animated-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-pop">
                  Start for free <ArrowRight size={18} />
                </Link>
                <Link href="/experiences" className="press glow-border inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-semibold">
                  Browse interview experiences
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={320} className="mx-auto mt-14 max-w-5xl">
            <DemoBoard />
          </Reveal>
        </div>
      </section>

      {/* Topic marquee */}
      <section aria-label="Popular interview topics" className="border-y border-border bg-surface/60 py-5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="marquee flex shrink-0 gap-3 pr-3">
            {[...TOPICS, ...TOPICS].map((t, i) => (
              <Link
                key={i}
                href={`/experiences?search=${encodeURIComponent(t.split(" ")[0])}`}
                className="whitespace-nowrap rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="text-center">
              <div className="text-gradient font-display text-5xl font-extrabold">
                <CountUp value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Everything your job hunt needs</h2>
          <p className="mt-3 text-muted">From the first application to the final interview round.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <Spotlight className="glow-border group h-full rounded-2xl border border-border bg-surface p-6 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                    style={{ background: `${f.color}1f`, color: f.color }}
                  >
                    <f.icon size={22} />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works: a connected timeline */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
        </Reveal>
        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-10 hidden h-0.5 bg-gradient-to-r from-brand via-brand-2 to-brand-3 opacity-40 md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 150}>
              <Spotlight className="relative h-full rounded-2xl border border-border bg-surface p-6 text-center shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                <span className="animated-gradient mx-auto grid h-14 w-14 place-items-center rounded-2xl font-display text-lg font-extrabold text-white shadow-pop">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="animated-gradient relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white shadow-pop">
            <div aria-hidden className="float absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div aria-hidden className="float absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" style={{ animationDelay: "-2s" }} />
            <h2 className="relative font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to take control of your job hunt?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">Create your free board in under a minute.</p>
            <Link href="/signup" className="press relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-[#0f172a] shadow-pop">
              Create my board <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

    </div>
  );
}
