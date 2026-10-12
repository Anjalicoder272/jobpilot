# JobPilot

**Live project:** https://jobpilot-nine-ebon.vercel.app

## About JobPilot
JobPilot is an AI-assisted job hunt tracker that brings the whole job search into one place. Instead of juggling job portals, spreadsheets, Gmail threads and scattered notes, candidates add every application to a simple Kanban board and move it forward as it progresses, from applied to HR replied, interview, and finally an offer. The board shows response rates and reminds them to follow up when an HR hasn't replied, so no opportunity is forgotten.

JobPilot also helps candidates get each application right. They can check their resume against any job link or description to see how well it fits, which skills are missing and what to add before applying, and get a tailored email to the HR written only from facts in their own resume. When an interview is scheduled, JobPilot prepares them for it with a focused plan, likely questions and real interview experiences from other candidates on LeetCode, Glassdoor, Reddit and JobPilot itself. Candidates can share their own experiences too, helping the next person prepare.

## Features
- **Kanban board** to track every job application: drag cards from Applied → HR Replied → Interview → Offer → Rejected.
- **Application stats**: total applications, response rate, interviews and offers at a glance.
- **Follow-up reminders** when an HR hasn't replied by the follow-up date.
- **Job Match**: upload your resume, paste a job link or description, and see your match score, the skills you have, what's missing, and what to add, with a "Ready to go" verdict when your resume is a strong fit.
- **AI cold emails** to HR, written only from facts in your resume, ready to open in Gmail.
- **"Prepare me" interview plan**: focus topics, a 3-day checklist, likely questions and tips for each interview.
- **Company insights**: search any company and role to find real interview experiences from LeetCode, Glassdoor and Reddit, plus questions shared on JobPilot.
- **Interview experiences**: browse and share experiences, with infinite scroll, filters, smart search by meaning, and "I was asked this too" votes.
- **Redis caching**: web-search results (3 days), search embeddings (1 day) and rate-limit counters live in Redis, so repeat searches load in milliseconds and the paid search API is called once per company and role. If Redis is down, the app falls back to PostgreSQL instead of failing.
- **Extract questions** from rough interview notes automatically.
- **Privacy and moderation**: emails and phone numbers are removed from shared posts, and spam is held for review.
- **Light and dark mode**, responsive on mobile and desktop.

## Tech stack
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, dnd-kit
- **Backend:** Python, Django 5, Django REST Framework, JWT authentication
- **Database:** PostgreSQL (SQLite for local development)
- **Cache:** Redis (Render Key Value)
- **AI and search:** Google Gemini, Tavily search API
- **Testing and CI:** pytest, GitHub Actions
- **Deployment:** Vercel (frontend), Render (backend and database)

## Folder structure
```
jobpilot/
├── backend/                  Django API
│   ├── config/               settings and URLs
│   ├── accounts/             signup, login, resume profile
│   ├── applications/         job applications and Kanban board
│   ├── experiences/          interview experiences, questions and votes
│   ├── matching/             resume match, emails, prep plans, insights, web search
│   ├── tests/                backend tests
│   └── manage.py
├── frontend/                 Next.js app
│   └── src/
│       ├── app/              pages (home, board, job match, insights, experiences)
│       ├── components/       UI components
│       └── lib/              API client, auth, types
├── .github/workflows/        CI pipeline
└── render.yaml               Render deployment config (API, PostgreSQL, Redis)
```
