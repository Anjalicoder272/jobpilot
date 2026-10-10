"""
Resume parsing, match scoring and cold-email drafting.

Modes:
- "ai":    Claude (ANTHROPIC_API_KEY) or Google Gemini (GEMINI_API_KEY, has a free tier).
- "basic": a built-in skill matcher and email template (no key needed).
If an AI call fails for any reason, we fall back to basic mode instead of erroring.
"""
import json
import logging
import math
import re
import time
import urllib.error
import urllib.request
from collections import Counter

from django.conf import settings
from pypdf import PdfReader

from .skills import extract_skills

log = logging.getLogger(__name__)

MAX_RESUME_CHARS = 15_000
MAX_JD_CHARS = 8_000


# ---------- Resume ----------

def extract_pdf_text(file) -> str:
    """Read all text from an uploaded PDF and tidy up the whitespace."""
    reader = PdfReader(file)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


# ---------- Basic (no AI) matching ----------

STOPWORDS = set("""a an and are as at be by for from has have in is it its of on or that the this to was were
will with you your we our they their us i me my about into over under than then them these those can
should would could also other such using use used work working experience years year strong good
ability team role job candidate looking join plus""".split())


def _words(text: str) -> Counter:
    return Counter(w for w in re.findall(r"[a-z][a-z+#.]{1,}", text.lower()) if w not in STOPWORDS)


def _cosine(a: Counter, b: Counter) -> float:
    common = set(a) & set(b)
    dot = sum(a[w] * b[w] for w in common)
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def basic_match(resume_text: str, jd_text: str) -> dict:
    """
    Score = 75% skill coverage (how many of the JD's skills your resume has)
          + 25% overall wording similarity.
    """
    resume_skills = set(extract_skills(resume_text))
    jd_skills = extract_skills(jd_text)
    matched = [s for s in jd_skills if s in resume_skills]
    missing = [s for s in jd_skills if s not in resume_skills]

    similarity = min(1.0, _cosine(_words(resume_text), _words(jd_text)) * 2.5)
    if jd_skills:
        score = 0.75 * (len(matched) / len(jd_skills)) + 0.25 * similarity
    else:
        score = similarity

    score = round(score * 100)
    if not jd_skills:
        summary = "No specific skills were detected in this job description, so the score is based on overall wording."
    elif not missing:
        summary = f"Your resume covers all {len(jd_skills)} skills this job mentions."
    else:
        summary = (f"Your resume covers {len(matched)} of the {len(jd_skills)} skills this job mentions. "
                   f"Consider highlighting or learning: {', '.join(missing[:4])}.")
    return {"score": score, "matched": matched, "missing": missing, "summary": summary, "source": "basic"}


# ---------- AI (Claude) ----------

def ai_provider() -> str | None:
    """Which AI to use: AI_PROVIDER if set, else Claude if its key exists, else Gemini, else none."""
    forced = settings.AI_PROVIDER
    if forced == "claude" and settings.ANTHROPIC_API_KEY:
        return "claude"
    if forced == "gemini" and settings.GEMINI_API_KEY:
        return "gemini"
    if settings.ANTHROPIC_API_KEY:
        return "claude"
    if settings.GEMINI_API_KEY:
        return "gemini"
    return None


def ai_enabled() -> bool:
    return ai_provider() is not None


def ai_model_name() -> str:
    return {"claude": settings.AI_MODEL, "gemini": settings.GEMINI_MODEL}.get(ai_provider() or "", "")


def _parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)  # the JSON object, even if wrapped in prose
    return json.loads(match.group(0) if match else text)


def _ask_claude(system: str, prompt: str, max_tokens: int) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=settings.AI_TIMEOUT, max_retries=1)
    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_json("".join(block.text for block in message.content if block.type == "text"))


def _ask_gemini(system: str, prompt: str, max_tokens: int) -> dict:
    """Call the Gemini REST API directly (no SDK needed) and ask for a JSON response."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        # Newer Gemini models "think" before answering, which uses output tokens, so leave plenty of room.
        "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": max(4096, max_tokens * 4)},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY},
        method="POST",
    )
    for attempt in range(2):  # one quick retry when Gemini is briefly overloaded (503)
        try:
            with urllib.request.urlopen(request, timeout=settings.AI_TIMEOUT) as response:
                data = json.loads(response.read())
            break
        except urllib.error.HTTPError as error:
            if error.code != 503 or attempt == 1:
                raise
            time.sleep(2)
    text = "".join(part.get("text", "") for part in data["candidates"][0]["content"]["parts"])
    return _parse_json(text)


def _ask_ai(system: str, prompt: str, max_tokens: int = 900) -> dict:
    """Send one prompt to the configured AI and return the JSON object it replies with."""
    if ai_provider() == "claude":
        return _ask_claude(system, prompt, max_tokens)
    return _ask_gemini(system, prompt, max_tokens)


def ai_match(resume_text: str, jd_text: str) -> dict:
    system = (
        "You compare a candidate's resume with a job description and return ONLY a JSON object. "
        "Be honest and specific. Base every statement only on the two texts given."
    )
    prompt = f"""Resume:
<resume>
{resume_text[:MAX_RESUME_CHARS]}
</resume>

Job description:
<job>
{jd_text[:MAX_JD_CHARS]}
</job>

Return JSON with exactly these keys:
- "score": integer 0-100, how well the resume fits this job
- "matched": list of up to 10 short skill names the job asks for that the resume clearly shows
- "missing": list of up to 8 short skill names the job asks for that the resume does not show
- "summary": 2 sentences: the strongest fit, and the biggest gap to address"""
    data = _ask_ai(system, prompt)
    return {
        "score": max(0, min(100, int(data["score"]))),
        "matched": [str(s)[:40] for s in data.get("matched", [])][:10],
        "missing": [str(s)[:40] for s in data.get("missing", [])][:8],
        "summary": str(data.get("summary", ""))[:600],
        "source": "ai",
    }


def match_resume(resume_text: str, jd_text: str) -> dict:
    """Use AI when available; otherwise (or if the AI call fails) use the basic matcher."""
    if ai_enabled():
        try:
            return ai_match(resume_text, jd_text)
        except Exception:  # network error, bad JSON, quota... never break the user's flow
            log.exception("AI match failed; falling back to basic matching")
    return basic_match(resume_text, jd_text)


# ---------- Cold email ----------

def _highlights(resume_text: str, limit: int = 3) -> list[str]:
    """Pick resume lines that contain numbers (impact), e.g. "reduced load time by 45%"."""
    lines = [l.strip(" •-*\t") for l in resume_text.splitlines()]
    impact = [l for l in lines if re.search(r"\d+\s*%|\d+\s*(ms|x|k\b)|\bby \d+", l) and 30 < len(l) < 260]
    return impact[:limit]


def basic_email(name: str, company: str, role: str, hr_name: str, resume_text: str, matched: list[str]) -> dict:
    greeting = f"Hi {hr_name.split()[0]}," if hr_name else f"Hi {company} Hiring Team,"
    skills = ", ".join(matched[:5]) if matched else ", ".join(extract_skills(resume_text)[:5])
    bullets = "\n".join(f"- {h}" for h in _highlights(resume_text))
    parts = [greeting, f"I'd like to apply for the {role} role at {company}."]
    if skills:
        parts.append(f"My experience with {skills} matches what this role needs.")
    if bullets:
        parts.append(f"A few highlights from my work:\n{bullets}")
    parts.append("I'd be glad to share my resume and discuss how I can contribute to your team.")
    parts.append(f"Best regards,\n{name}")
    body = "\n\n".join(parts)
    return {"subject": f"Application: {role}", "body": body, "source": "basic"}


def ai_email(name: str, company: str, role: str, hr_name: str, resume_text: str, jd_text: str) -> dict:
    system = (
        "You write short, genuine job application emails. Use ONLY facts that appear in the resume: "
        "never invent numbers, companies, skills or experience. Return ONLY a JSON object."
    )
    prompt = f"""Write a cold email from {name} applying for the "{role}" role at {company}.
Address it to {hr_name or f"the {company} hiring team"}.

<resume>
{resume_text[:MAX_RESUME_CHARS]}
</resume>

<job>
{jd_text[:MAX_JD_CHARS] or "(no job description provided)"}
</job>

Rules: 120-180 words, friendly and professional, 2-4 bullet points of the most relevant achievements
from the resume (keep their real numbers), no placeholders like [Company], end with "Best regards,\\n{name}".
The subject must be short and must not contain the candidate's name, e.g. "Application: {role}".

Return JSON: {{"subject": "...", "body": "..."}}"""
    data = _ask_ai(system, prompt, max_tokens=800)
    return {"subject": str(data["subject"])[:150], "body": str(data["body"])[:4000], "source": "ai"}


def draft_email(name, company, role, hr_name, resume_text, jd_text, matched) -> dict:
    if ai_enabled():
        try:
            return ai_email(name, company, role, hr_name, resume_text, jd_text)
        except Exception:
            log.exception("AI email failed; falling back to the template")
    return basic_email(name, company, role, hr_name, resume_text, matched)


# ---------- Resume check ("is my resume ready for this job?") ----------

def verdict_for(score: int, missing: list[str]) -> str:
    """ready = strong match; almost = a few gaps; needs_work = many gaps."""
    if score >= 80 and len(missing) <= 1:
        return "ready"
    if score >= 60:
        return "almost"
    return "needs_work"


def basic_suggestions(missing: list[str]) -> list[str]:
    tips = [f"If you have used {skill}, add it to your skills and mention where (a project or your current role)."
            for skill in missing[:4]]
    if missing:
        tips.append("Mirror the job's wording: use the same skill names the description uses.")
    return tips


def ai_resume_check(resume_text: str, jd_text: str) -> dict:
    system = ("You review a resume against a job description. Return ONLY JSON. Be specific and honest. "
              "Suggestions must never ask the candidate to claim experience they don't have: phrase them as "
              "'if you have done X, add it' or 'highlight your existing Y'.")
    prompt = f"""<resume>
{resume_text[:MAX_RESUME_CHARS]}
</resume>

<job>
{jd_text[:MAX_JD_CHARS]}
</job>

Return JSON with exactly these keys:
- "score": integer 0-100, how well the resume fits this job
- "matched": up to 10 short skill names the job asks for that the resume clearly shows
- "missing": up to 8 short skill names or requirements the job asks for that the resume does not show
- "suggestions": 3-5 concrete edits to make the resume fit this job better (one sentence each)
- "summary": 2 sentences: the strongest fit and the biggest gap"""
    data = _ask_ai(system, prompt, max_tokens=1200)
    return {
        "score": max(0, min(100, int(data["score"]))),
        "matched": [str(x)[:40] for x in data.get("matched", [])][:10],
        "missing": [str(x)[:60] for x in data.get("missing", [])][:8],
        "suggestions": [str(x)[:250] for x in data.get("suggestions", [])][:5],
        "summary": str(data.get("summary", ""))[:600],
        "source": "ai",
    }


def check_resume(resume_text: str, jd_text: str) -> dict:
    result = None
    if ai_enabled():
        try:
            result = ai_resume_check(resume_text, jd_text)
        except Exception:
            log.exception("AI resume check failed; using the basic matcher")
    if result is None:
        result = basic_match(resume_text, jd_text)
        result["suggestions"] = basic_suggestions(result["missing"])
    result["verdict"] = verdict_for(result["score"], result["missing"])
    return result
