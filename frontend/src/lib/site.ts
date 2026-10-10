export const SITE = {
  name: "JobPilot",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobpilot-nine-ebon.vercel.app").replace(/\/+$/, ""),
  title: "JobPilot: track applications, match your resume, prepare for interviews",
  description:
    "A job-search workspace for developers. Track every application on one board, check your resume against any job, and prepare with real interview questions from other candidates.",
};
