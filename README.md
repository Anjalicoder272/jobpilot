# JobPilot

Track every job application on one Kanban board, and prepare with real interview experiences from other candidates.

- **Frontend:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · dnd-kit
- **Backend:** Django 5 · Django REST Framework · SimpleJWT (httpOnly cookies) · SQLite locally, PostgreSQL in production

## Features (Phase 1)
- **Auth:** sign up, log in and log out. The JWT lives in an httpOnly cookie, so JavaScript never touches the token. An expired access token is refreshed automatically once.
- **Kanban board:** drag applications between Applied → HR Replied → Interview → Offer → Rejected (mouse or keyboard). The UI updates instantly (optimistic update) and rolls back if saving fails. Every move is stored in a status history.
- **Follow-up reminders:** cards show "Follow up today" when an HR hasn't replied by the follow-up date.
- **Interview experiences:** a public feed with **infinite scroll** (cursor pagination + IntersectionObserver), filters in the URL (company, level, topic, search with debounce), stale requests cancelled with AbortController, and a "most-asked topics" chart.
- **Share an experience:** a form with any number of questions, each tagged by topic and difficulty.
- **UI:** light/dark theme without flicker, scroll-reveal animations, skeleton loaders, responsive down to phone width, visible focus only for keyboard users.

## Features (Phase 2)
- **Resume upload:** drag and drop a PDF (max 2 MB). The text is extracted with `pypdf`, and skills are detected with a built-in dictionary of ~60 skills and their aliases ("ReactJS", "Postgres", "JS/TS"…).
- **Resume match:** for any application with a job description, get a score, the skills you have, the ones you're missing, and a short summary. The score ring animates, and the % shows on the card.
- **Cold email writer:** drafts an email to the HR using only facts from your resume. Edit it, copy it, or open it pre-filled in Gmail. JobPilot never sends emails on your behalf.
- **Follow-up reminders:** `python manage.py send_followup_reminders` emails each user a daily digest of applications due for a follow-up (never twice a day). Run it from cron.
- **AI providers:** Google **Gemini** (free tier) or **Claude**, chosen automatically from the keys in `backend/.env`. With no key, a **basic mode** (skill matcher + template email) is used. If an AI call fails, it falls back to basic mode, and the UI always labels results as "AI" or "Basic match". AI endpoints are rate-limited (40/hour per user).

## Features (Phase 3)
- **Extract questions from notes:** on the share form, paste rough interview notes and get a clean list of questions, each tagged with a topic and difficulty (AI, or a rule-based extractor in basic mode).
- **Privacy:** emails and phone numbers are removed from every shared experience before it is saved, with or without AI.
- **Moderation:** posts with links or promotion, or that the AI flags as spam/abuse/off-topic, are saved but hidden until approved in Django Admin. The author sees a "waiting for review" message.
- **"Prepare me" plan:** for cards in Interview (or Offer), a plan built from real questions shared for that company (similar roles first), the job description and your resume: focus topics, a 3-day checklist with progress, likely questions and tips. Questions are labelled **"Asked at <company>"** only if they really exist in the database (the AI cannot fake this), otherwise **"Suggested"**. With no shared experiences, the plan is based on the job description.

## Features (Phase 4)
- **"I was asked this too" votes:** one vote per user per question, with an optimistic toggle. The prep plan lists the most-confirmed questions first.
- **Smart search:** finds questions by meaning, not exact words ("async code" → event loop, debounce, cancelling stale requests). Each question gets a 768-number Gemini embedding when it is shared (`python manage.py embed_questions` backfills old ones, in rate-limit-friendly batches with retries). Search compares embeddings with cosine similarity and keeps only clear matches (close to the best score and well above the median); matching questions are highlighted. Shown only when a Gemini key is set.
- **Production-ready:** PostgreSQL via `DATABASE_URL`, gunicorn, whitenoise, HTTPS/secure cookies, refuses to start without `DJANGO_SECRET_KEY`, `manage.py check --deploy` clean apart from optional HSTS preload flags.
- **CI:** GitHub Actions runs backend checks + tests and frontend lint, type check and production build on every push.

## Job Match (resume check against a job)
On the **Job Match** page (`/job-match`), upload your resume once, then paste a **job link** (Naukri, LinkedIn's public job page, company careers pages, Greenhouse, Lever…) or the job description text, and click **Check my resume**:
- A score and a verdict: **Ready to go 🚀** (strong match: a celebration popup with confetti), **Almost there**, or **Needs some work**.
- Skills already on your resume, what's missing, and concrete suggestions (phrased as "if you have used X, add it", never "claim X").
- **Add to my board** saves the job as an application, with company and role filled in from the page when possible.
- The link is fetched safely: http(s) only, private/local/cloud-metadata addresses are blocked (re-checked on every redirect), 10-second timeout, 2 MB limit. The cleanest job text comes from the page's schema.org `JobPosting` data when available.
- If the AI is slow or unavailable, it falls back to the basic matcher (AI calls time out after 25 s and retry once on 503).

## Company insights (any company, any role)
`/insights`: type a company and job title (e.g. "Amazon", "SDE-1"). The page shows **only real data**:
- Real questions candidates shared on JobPilot for that company (most-voted first), or an honest "nobody has shared this company yet" message with a prompt to share.
- One-click searches on LeetCode Discuss, GeeksforGeeks, Glassdoor, AmbitionBox and Reddit for first-hand experiences. We link to other sites; we never scrape or copy them.
- Optional **web mode**: if the Gemini plan includes Google Search grounding, a summary of public web results is shown, **always with its source links** (results without sources are discarded). It's cached for 7 days, a failed refresh never replaces a good result, and after a rejection it isn't retried for 6 hours.
- **Real experiences from the web (Tavily):** with `TAVILY_API_KEY` set, the page lists real interview-experience posts from LeetCode, GeeksforGeeks, Glassdoor, AmbitionBox and Reddit: site, title, a short preview and the link, like a search results page. Clicking opens the original post. Only those trusted sites are searched, posts that don't mention the company are dropped, results are cached for 3 days per company + role, and a failed search keeps the previous results. The prep panel shows the top 5.
- Questions invented from an AI's general knowledge are deliberately **never shown**, because they may be wrong.

## AI setup (optional)
```bash
cd backend && cp .env.example .env
# then put ONE of these in .env:
GEMINI_API_KEY=...       # free tier: https://aistudio.google.com -> Get API key
ANTHROPIC_API_KEY=...    # paid: https://console.anthropic.com -> API Keys
```
Restart Django after editing `.env`. The file is gitignored; never commit keys.

## Run locally
You need Python 3.12 and Node 20+.

```bash
# Backend (http://127.0.0.1:8000)
cd backend
python3.12 -m venv .venv          # or: uv venv --python 3.12 .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo   # demo user: demo@jobpilot.dev / demo12345 (fictional companies)
.venv/bin/python manage.py runserver

# Frontend (http://localhost:3000), in another terminal
cd frontend
npm install
npm run dev
```

The Next.js dev server proxies `/api/*` to Django (see `next.config.ts`), so the browser sees a single origin and the auth cookies work without CORS.

Admin panel: `.venv/bin/python manage.py createsuperuser`, then open http://127.0.0.1:8000/admin/ (approve/hide interview experiences there).

## Deploy (free tiers)
**1. Push to GitHub.** `backend/.env` is gitignored; never commit keys.

**2. Backend + database on Render**
- Render dashboard → **New → Blueprint** → pick the repo. `render.yaml` creates `jobpilot-api` (Django) and `jobpilot-db` (PostgreSQL).
- When asked, set `GEMINI_API_KEY` (optional) and `DJANGO_CSRF_TRUSTED_ORIGINS` (your Vercel URL + Render URL).
- First deploy runs `build.sh` (install, collectstatic, migrate). Optional: open the Render **Shell** and run `python manage.py seed_demo`, `python manage.py createsuperuser`, `python manage.py embed_questions`.

**3. Frontend on Vercel**
- Vercel → **Add New → Project** → import the repo → **Root Directory: `frontend`**.
- Environment variable: `API_URL=https://jobpilot-api.onrender.com` (your Render URL) → Deploy.
- The browser only talks to Vercel; Next.js rewrites `/api/*` to Render, so the httpOnly auth cookies stay first-party.

Notes: Render's free web service sleeps after inactivity (the first request can take ~1 minute), and free PostgreSQL databases expire after a limited period, so check Render's current free-tier terms. Follow-up reminders need a scheduler (e.g. a Render cron job or GitHub Actions schedule running `python manage.py send_followup_reminders`).

## Tests
```bash
cd backend && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest     # 56 tests; AI and web-search calls are always mocked (see conftest.py)
```

## API
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/signup/`, `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/refresh/` | Set/clear httpOnly JWT cookies |
| GET | `/api/auth/me/` | Current user |
| GET/POST | `/api/applications/` | Your applications |
| GET/PATCH/DELETE | `/api/applications/:id/` | |
| POST | `/api/applications/:id/move/` | `{status, index}`: move a card and renumber the column |
| GET | `/api/applications/stats/` | Count per status |
| GET/POST | `/api/experiences/` | Public list (cursor-paginated), create needs login. Filters: `company`, `level`, `topic`, `search` |
| GET | `/api/experiences/topics/?company=` | Most-asked topics |
| GET/POST/DELETE | `/api/resume/` | Resume summary · upload PDF (`file`) · remove |
| GET | `/api/ai/status/` | Whether AI is on and which provider (never the key) |
| POST | `/api/resume/check/` | `{job_url}` or `{jd_text}` → score, verdict, missing skills, suggestions (nothing saved) |
| POST | `/api/applications/:id/match/` | Resume vs job description → score, matched/missing skills |
| POST | `/api/applications/:id/email/` | Draft a cold email (not sent) |
| GET/POST | `/api/applications/:id/prep/` | Saved prep plan · build a new one |
| POST | `/api/experiences/extract/` | `{notes}` → tagged questions (nothing saved) |
| GET | `/api/experiences/?search=…&smart=1` | Smart (semantic) search; returns `matched_question_ids` |
| POST | `/api/questions/:id/vote/` | Toggle "I was asked this too" |
| GET/POST | `/api/insights/?company=&role=` | Real shared questions + links (+ sourced web summary if available) · POST to refresh |

## Project structure
```
backend/
  config/        settings, urls
  accounts/      signup/login, cookie JWT authentication
  applications/  Company, Application, StatusChange + Kanban move logic
  experiences/   Experience, Question + seed_demo command
  matching/      skills dictionary, resume parsing, match scoring, email drafts, Gemini/Claude clients
  tests/         API tests (pytest)
frontend/src/
  app/           pages: landing, login, signup, board, experiences, experiences/new
  components/    Navbar, Reveal, ThemeToggle, board/*, experiences/*, ui/*
  lib/           api client, auth context, types
```

## Ideas for later
- Move embeddings to pgvector when the question count grows into the hundreds of thousands.
- Gmail integration to detect HR replies and move cards automatically.
