export type Status = "APPLIED" | "HR_REPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

export type User = { id: number; email: string; name: string };

export type Application = {
  id: number;
  company: string;
  company_slug: string;
  role: string;
  location: string;
  job_url: string;
  jd_text: string;
  status: Status;
  position: number;
  hr_name: string;
  hr_email: string;
  notes: string;
  applied_on: string;
  follow_up_on: string | null;
  is_follow_up_due: boolean;
  match_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  match_summary: string;
  match_source: "" | "ai" | "basic";
  updated_at?: string;
};

export type ResumeInfo = {
  filename: string;
  skills: string[];
  characters: number;
  uploaded_at: string | null;
  has_resume: boolean;
};

export type AIStatus = {
  enabled: boolean;
  provider: "claude" | "gemini" | null;
  model: string;
  smart_search?: boolean;
  web_search?: boolean;
};

export type WebExperience = { title: string; url: string; site: string; snippet: string; published: string };

export type EmailDraft = { subject: string; body: string; to: string; source: "ai" | "basic" };

export type Question = {
  id: number;
  text: string;
  topic: string;
  topic_label: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  votes: number;
  voted: boolean;
};

export type Experience = {
  id: number;
  company: string;
  company_slug: string;
  role: string;
  level: string;
  level_label: string;
  result: "SELECTED" | "REJECTED" | "PENDING";
  result_label: string;
  rounds: number;
  summary: string;
  interviewed_on: string | null;
  author: string;
  questions: Question[];
  created_at: string;
  is_published?: boolean;
  moderation_note?: string;
};

export type PrepPlan = {
  focus_topics: { label: string; why: string; topic?: string }[];
  likely_questions: { question: string; source: "real" | "online" | "suggested"; topic?: string }[];
  days: { day: number; title: string; tasks: string[] }[];
  tips: string[];
  based_on: number;
  source: "ai" | "basic";
};

export type Page<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
  smart?: boolean;
  matched_question_ids?: number[];
};

export type TopicCount = { topic: string; label: string; count: number };

// Kanban columns, in order, with their accent color.
export const COLUMNS: { status: Status; label: string; color: string }[] = [
  { status: "APPLIED", label: "Applied", color: "#3b82f6" },
  { status: "HR_REPLIED", label: "HR Replied", color: "#f59e0b" },
  { status: "INTERVIEW", label: "Interview", color: "#8b5cf6" },
  { status: "OFFER", label: "Offer", color: "#10b981" },
  { status: "REJECTED", label: "Rejected", color: "#f43f5e" },
];

export const TOPICS = [
  { value: "JAVASCRIPT", label: "JavaScript" },
  { value: "REACT", label: "React" },
  { value: "CSS", label: "HTML & CSS" },
  { value: "PERFORMANCE", label: "Web performance" },
  { value: "DSA", label: "DSA" },
  { value: "SYSTEM_DESIGN", label: "System design" },
  { value: "BACKEND", label: "Backend & APIs" },
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "OTHER", label: "Other" },
];

export const LEVELS = [
  { value: "INTERN", label: "Intern" },
  { value: "SDE1", label: "SDE-1" },
  { value: "SDE2", label: "SDE-2" },
  { value: "SENIOR", label: "Senior" },
];

export type CompanyInsights = {
  company: string;
  role: string;
  mode: "web" | "basic";
  overview?: string;
  rounds?: { name: string; what: string }[];
  topics?: { label: string; detail: string }[];
  questions?: { question: string; type: "coding" | "technical" | "behavioral" }[];
  tips?: string[];
  confidence?: "high" | "medium" | "low";
  sources: { title: string; url: string }[];
  links: { site: string; url: string }[];
  community: { question: string; topic: string; votes: number }[];
  /** Real posts on other sites (title + preview + link). null = web search not configured. */
  web_experiences: WebExperience[] | null;
  generated_at: string;
};

export type ResumeCheck = {
  score: number;
  matched: string[];
  missing: string[];
  suggestions: string[];
  summary: string;
  source: "ai" | "basic";
  verdict: "ready" | "almost" | "needs_work";
  job: { title: string; company: string; url: string; description: string };
};
