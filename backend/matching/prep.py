"""
"Prepare me" plan for an application in the Interview stage.

It is grounded in real data: questions other candidates shared for the same company (and similar roles),
plus the job description and the user's resume. Real questions are always labelled as real; anything the
AI suggests is labelled as a suggestion. With no AI, a basic plan is built from the same data.
"""
import logging
from collections import Counter

from django.db.models import Count, Q

from experiences.ai import guess_topic
from experiences.models import Question

from .services import UNTRUSTED, _ask_ai, ai_enabled
from .skills import extract_skills

log = logging.getLogger(__name__)
TOPIC_LABELS = dict(Question.Topic.choices)

# Practice ideas per topic, used by the basic plan.
TOPIC_TASKS = {
    "JAVASCRIPT": "Revise closures, promises, the event loop and `this`; write debounce and throttle from scratch.",
    "REACT": "Revise hooks (useEffect, useMemo, useCallback), rendering and keys; explain one optimisation you did.",
    "CSS": "Practise flexbox/grid layouts, specificity and responsive design; centre elements three ways.",
    "PERFORMANCE": "Prepare your Core Web Vitals story with numbers: LCP, CLS, lazy loading and code splitting.",
    "DSA": "Solve 3-4 medium problems on arrays, strings and hash maps; say the time complexity out loud.",
    "SYSTEM_DESIGN": "Sketch one design end to end (e.g. infinite feed or rate limiter): API, data, caching, scaling.",
    "BACKEND": "Revise REST status codes, auth with JWT, caching with Redis and SQL indexes.",
    "BEHAVIORAL": "Prepare 3 STAR stories: a production bug, a disagreement, and your proudest project.",
    "OTHER": "Read the job description again and prepare one example for each requirement.",
}


def real_questions(company_id: int, role: str) -> list[dict]:
    """Published questions shared for this company; similar roles first."""
    words = [w for w in role.lower().split() if len(w) > 2]
    # Most-confirmed questions ("I was asked this too") come first.
    qs = (Question.objects.filter(experience__company_id=company_id, experience__is_published=True)
          .annotate(vote_count=Count("votes")).order_by("-vote_count", "id"))
    role_filter = Q()
    for w in words:
        role_filter |= Q(experience__role__icontains=w)
    similar = list(qs.filter(role_filter)) if words else []
    rest = list(qs.exclude(pk__in=[q.pk for q in similar]))
    rows, seen = [], set()
    for q in similar + rest:
        key = q.text.lower().strip()
        if key not in seen:
            seen.add(key)
            rows.append({"text": q.text, "topic": q.topic, "difficulty": q.difficulty})
    return rows[:30]


def cached_insight_questions(company: str, role: str) -> tuple[list[str], str]:
    """Questions from saved web insights (which come with source links). AI-knowledge questions are never used."""
    from .insights import normalise
    from .models import CompanyInsight

    rows = CompanyInsight.objects.filter(company_key=normalise(company), mode="web")
    insight = rows.filter(role_key=normalise(role)).first() or rows.order_by("-created_at").first()
    if not insight:
        return [], ""
    return [q["question"] for q in insight.data.get("questions", [])], "online"


def basic_plan(company: str, role: str, questions: list[dict], jd_text: str, missing: list[str],
               extra: list[str] | None = None, extra_label: str = "") -> dict:
    topic_counts = Counter(q["topic"] for q in questions)
    if not topic_counts:  # no shared experiences yet: use the job description's skills
        for skill in extract_skills(jd_text):
            topic_counts[guess_topic(skill)] += 1
    if not topic_counts:
        topic_counts.update({"JAVASCRIPT": 1, "REACT": 1, "BEHAVIORAL": 1})

    total = sum(topic_counts.values())
    focus = [{"topic": t, "label": TOPIC_LABELS[t],
              "why": (f"Asked {n} time{'s' if n > 1 else ''} in shared {company} interviews."
                      if questions else "Mentioned in the job description.")}
             for t, n in topic_counts.most_common(4)]

    top = [f["topic"] for f in focus]
    days = [
        {"day": 1, "title": "Core concepts", "tasks": [TOPIC_TASKS[t] for t in top[:2]]},
        {"day": 2, "title": "Practice", "tasks": [TOPIC_TASKS[t] for t in top[2:4]] or
            ["Solve 3 problems from the likely questions below without looking at answers."]},
        {"day": 3, "title": "Mock + stories", "tasks": [
            "Answer every likely question below out loud, in under 3 minutes each.",
            TOPIC_TASKS["BEHAVIORAL"],
        ]},
    ]
    if missing:
        days[1]["tasks"].append(f"Fill gaps from the job description: {', '.join(missing[:3])}.")

    likely = [{"question": q["text"], "source": "real", "topic": TOPIC_LABELS.get(q["topic"], "Other")}
              for q in questions[:10]]
    # Top up with questions from web insights (sourced), labelled "online", never "asked here".
    for text in (extra or [])[: max(0, 12 - len(likely))]:
        likely.append({"question": text, "source": extra_label})
    return {
        "focus_topics": focus,
        "likely_questions": likely,
        "days": days,
        "tips": [
            f"Research {company}'s product and be ready to say why you want this {role} role.",
            "Use numbers from your resume when you describe your work.",
            "Think out loud during coding rounds: interviewers grade the approach, not just the answer.",
        ],
        "based_on": len(questions),
        "source": "basic",
    }


def ai_plan(company: str, role: str, questions: list[dict], jd_text: str, resume_text: str,
            extra: list[str] | None = None, extra_label: str = "") -> dict:
    asked = "\n".join(f"- [{TOPIC_LABELS.get(q['topic'], 'Other')}] {q['text']}" for q in questions) or "(none shared yet)"
    reported = "\n".join(f"- {t}" for t in (extra or [])) or "(none)"
    system = ("You are an interview coach. Return ONLY JSON. Use the real questions provided; never claim "
              "a question was asked at the company unless it is in the provided list. " + UNTRUSTED)
    prompt = f"""The candidate has an interview for "{role}" at {company}.

Questions real candidates were asked at {company}:
{asked}

Questions commonly reported online for this role at {company} (from a web summary with sources):
{reported}

<job>
{jd_text[:5000] or "(no job description)"}
</job>

<resume>
{resume_text[:6000] or "(no resume uploaded)"}
</resume>

Return JSON:
{{
  "focus_topics": [{{"label": "short topic", "why": "one sentence"}}],        // 3-4 items
  "likely_questions": [{{"question": "...", "source": "real" or "suggested"}}], // 8-12 items, real ones first
  "days": [{{"day": 1, "title": "...", "tasks": ["...", "..."]}}],               // 3 days, 2-3 tasks each
  "tips": ["...", "...", "..."]                                                 // specific to this candidate
}}
A question may be "real" only if it appears in the first list. Tasks should mention the candidate's gaps."""
    data = _ask_ai(system, prompt, max_tokens=2000)
    real_texts = {q["text"].lower().strip() for q in questions}
    reported_texts = {t.lower().strip() for t in (extra or [])}
    likely = []
    for item in data.get("likely_questions", [])[:12]:
        text = str(item.get("question", "")).strip()[:300]
        if text:
            # Never trust the AI's label: we decide the source by looking the question up ourselves.
            key = text.lower()
            source = "real" if key in real_texts else extra_label if key in reported_texts else "suggested"
            likely.append({"question": text, "source": source})
    return {
        "focus_topics": [{"label": str(f.get("label", ""))[:60], "why": str(f.get("why", ""))[:200]}
                         for f in data.get("focus_topics", [])[:4]],
        "likely_questions": likely,
        "days": [{"day": int(d.get("day", i + 1)), "title": str(d.get("title", ""))[:60],
                  "tasks": [str(t)[:250] for t in d.get("tasks", [])[:3]]}
                 for i, d in enumerate(data.get("days", [])[:3])],
        "tips": [str(t)[:250] for t in data.get("tips", [])[:4]],
        "based_on": len(questions),
        "source": "ai",
    }


def build_prep_plan(app, resume_text: str) -> dict:
    questions = real_questions(app.company_id, app.role)
    extra, extra_label = cached_insight_questions(app.company.name, app.role)
    if ai_enabled():
        try:
            return ai_plan(app.company.name, app.role, questions, app.jd_text, resume_text, extra, extra_label)
        except Exception:
            log.exception("AI prep plan failed; using the basic plan")
    return basic_plan(app.company.name, app.role, questions, app.jd_text, app.missing_skills, extra, extra_label)
