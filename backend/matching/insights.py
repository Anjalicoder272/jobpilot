"""
Interview insights for ANY company + role, even if nobody shared an experience on JobPilot.

We only show REAL data:
- Questions real candidates shared on JobPilot for that company (always).
- Links that search other sites (LeetCode Discuss, GFG, Glassdoor...) for first-hand experiences (always).
- "web" mode (optional): a summary of public web results from Gemini with Google Search grounding,
  shown only together with its source links. It needs a Gemini plan that includes search grounding.
We deliberately do NOT show questions invented from an AI's general knowledge, because they may be wrong.
We never scrape or copy other websites. Web results are cached for 7 days per company + role.
"""
import json
import logging
import re
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone

from experiences.models import Question

from .models import CompanyInsight
from .services import _parse_json, ai_provider

log = logging.getLogger(__name__)
CACHE_DAYS = 7
WEB_OFF_KEY = "insights:web-search-unavailable"
WEB_OFF_SECONDS = 6 * 60 * 60  # after a rejection, don't retry web search for 6 hours (saves free quota)
TOPIC_LABELS = dict(Question.Topic.choices)

SCHEMA = """{
  "overview": "2-3 sentences about the interview process",
  "rounds": [{"name": "Online assessment", "what": "what happens in this round"}],
  "topics": [{"label": "Data structures", "detail": "what is usually asked"}],
  "questions": [{"question": "...", "type": "coding" | "technical" | "behavioral"}],
  "tips": ["..."],
  "confidence": "high" | "medium" | "low"
}"""


def normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def search_links(company: str, role: str) -> list[dict]:
    """Links that open searches on other sites. We link out; we never copy their content."""
    q = urllib.parse.quote_plus
    google = "https://www.google.com/search?q="
    return [
        {"site": "LeetCode Discuss",
         "url": f"https://leetcode.com/discuss/interview-experience?currentPage=1&orderBy=most_relevant&query={q(f'{company} {role}')}"},
        {"site": "GeeksforGeeks", "url": google + q(f"site:geeksforgeeks.org {company} {role} interview experience")},
        {"site": "Glassdoor", "url": google + q(f"site:glassdoor.co.in {company} {role} interview questions")},
        {"site": "AmbitionBox", "url": google + q(f"site:ambitionbox.com {company} {role} interview questions")},
        {"site": "Reddit", "url": google + q(f"site:reddit.com {company} {role} interview experience")},
    ]


def community_questions(company: str) -> list[dict]:
    """Real questions shared on JobPilot for this company (most-voted first)."""
    qs = (Question.objects.filter(experience__company__name__iexact=company.strip(), experience__is_published=True)
          .annotate(vote_count=Count("votes")).order_by("-vote_count", "-id")[:15])
    return [{"question": q.text, "topic": TOPIC_LABELS.get(q.topic, "Other"), "votes": q.vote_count} for q in qs]


def _clean(data: dict) -> dict:
    """Keep only the fields we expect, with sane lengths, so the UI never breaks on odd AI output."""
    types = {"coding", "technical", "behavioral"}
    return {
        "overview": str(data.get("overview", ""))[:700],
        "rounds": [{"name": str(r.get("name", ""))[:80], "what": str(r.get("what", ""))[:300]}
                   for r in data.get("rounds", [])[:8] if r.get("name")],
        "topics": [{"label": str(t.get("label", ""))[:60], "detail": str(t.get("detail", ""))[:250]}
                   for t in data.get("topics", [])[:8] if t.get("label")],
        "questions": [{"question": str(x.get("question", ""))[:300],
                       "type": x.get("type") if x.get("type") in types else "technical"}
                      for x in data.get("questions", [])[:20] if x.get("question")],
        "tips": [str(t)[:250] for t in data.get("tips", [])[:6]],
        "confidence": data.get("confidence") if data.get("confidence") in {"high", "medium", "low"} else "medium",
    }


def _web_insights(company: str, role: str) -> tuple[dict, list[dict]]:
    """Gemini + Google Search grounding. Returns (data, sources). Raises if unavailable."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    prompt = (f"Search the web for recent interview experiences for the role \"{role}\" at {company}. "
              f"Summarise in your own words (do not copy text) and return ONLY a JSON object like:\n{SCHEMA}\n"
              "Include 10-15 commonly reported questions. If little information exists, say so in the overview "
              "and set confidence to low.")
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "tools": [{"google_search": {}}]}
    request = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read())
    candidate = payload["candidates"][0]
    text = "".join(part.get("text", "") for part in candidate["content"]["parts"])
    sources, seen = [], set()
    for chunk in candidate.get("groundingMetadata", {}).get("groundingChunks", []):
        web = chunk.get("web", {})
        if web.get("uri") and web.get("title") not in seen:
            seen.add(web.get("title"))
            sources.append({"title": web.get("title") or "Source", "url": web["uri"]})
    return _clean(_parse_json(text)), sources[:8]


def get_insights(company: str, role: str, refresh: bool = False) -> CompanyInsight:
    company, role = company.strip()[:120], role.strip()[:150]
    key = {"company_key": normalise(company), "role_key": normalise(role)}
    cached = CompanyInsight.objects.filter(**key).first()
    fresh = cached and cached.created_at > timezone.now() - timedelta(days=CACHE_DAYS) and cached.mode == "web"
    if cached and fresh and not refresh:
        return cached

    mode, data, sources = "basic", {}, []
    if ai_provider() == "gemini" and not cache.get(WEB_OFF_KEY):
        try:
            data, sources = _web_insights(company, role)
            mode = "web" if sources else "basic"  # a summary without sources isn't shown
        except Exception as error:  # search grounding not in this plan, rate limit, bad JSON...
            log.info("Web insights unavailable (%s)", error)
            cache.set(WEB_OFF_KEY, True, WEB_OFF_SECONDS)

    # Never replace a good sourced result with an empty one just because web search failed this time.
    if mode == "basic" and cached and cached.mode == "web":
        return cached

    insight, _ = CompanyInsight.objects.update_or_create(
        **key, defaults={"company": company, "role": role, "mode": mode,
                         "data": data if mode == "web" else {}, "sources": sources})
    return insight


def insight_payload(insight: CompanyInsight, refresh_web: bool = False) -> dict:
    from .websearch import find_real_experiences

    return {
        "company": insight.company,
        "role": insight.role,
        "mode": insight.mode,
        **(insight.data if insight.mode == "web" else {}),
        "sources": insight.sources,
        "links": search_links(insight.company, insight.role),
        "community": community_questions(insight.company),
        # Real posts on other sites (title + preview + link). None = Tavily key not set.
        "web_experiences": find_real_experiences(insight.company, insight.role, refresh=refresh_web),
        "generated_at": insight.created_at,
    }
