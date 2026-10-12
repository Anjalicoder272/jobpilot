"""
Find REAL interview-experience posts on other sites (LeetCode, GeeksforGeeks, Glassdoor, AmbitionBox, Reddit)
using the Tavily search API.

We only keep what a search engine shows: the title, a short preview and the link. The full post stays on
the original site and the user clicks through to read it. Nothing is scraped or republished.
Results are cached for 3 days per company + role, so each search uses the free quota only once:
Redis first (about a millisecond), then PostgreSQL (survives Redis restarts), then the Tavily API.
"""
import json
import logging
import re
import urllib.parse
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .models import ExperienceSearch

log = logging.getLogger(__name__)
CACHE_DAYS = 3
CACHE_SECONDS = CACHE_DAYS * 24 * 3600
TAVILY_URL = "https://api.tavily.com/search"

# Only these sites are searched and shown, with a friendly label.
SITES = {
    "leetcode.com": "LeetCode",
    "geeksforgeeks.org": "GeeksforGeeks",
    "glassdoor.co.in": "Glassdoor",
    "glassdoor.com": "Glassdoor",
    "ambitionbox.com": "AmbitionBox",
    "reddit.com": "Reddit",
}


def web_search_enabled() -> bool:
    return bool(settings.TAVILY_API_KEY)


def _site_label(url: str) -> str | None:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    for domain, label in SITES.items():
        if host == domain or host.endswith("." + domain):
            return label
    return None


def _clean_snippet(text: str) -> str:
    text = re.sub(r"\s+", " ", re.sub(r"[#*_>`|]+", " ", text or "")).strip()
    return (text[:220] + "…") if len(text) > 220 else text


def _tavily(query: str) -> list[dict]:
    body = {
        "query": query,
        "search_depth": "basic",
        "max_results": 15,
        "include_domains": list(SITES),
    }
    request = urllib.request.Request(
        TAVILY_URL,
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {settings.TAVILY_API_KEY}"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read()).get("results", [])


def normalise_results(raw: list[dict], company: str) -> list[dict]:
    """Keep only trusted sites, posts that mention the company, one entry per URL, best first."""
    company_words = [w for w in re.findall(r"[a-z0-9]+", company.lower()) if len(w) > 1]
    seen, results = set(), []
    for item in sorted(raw, key=lambda r: r.get("score", 0), reverse=True):
        url, title = str(item.get("url", "")), str(item.get("title", "")).strip()
        site = _site_label(url)
        haystack = f"{title} {item.get('content', '')}".lower()
        if not site or not title or url in seen or not url.startswith("https://"):
            continue
        if company_words and not all(w in haystack for w in company_words):
            continue  # off-topic result (a different company)
        seen.add(url)
        results.append({
            "title": title[:160],
            "url": url,
            "site": site,
            "snippet": _clean_snippet(str(item.get("content", ""))),
            "published": str(item.get("published_date") or "")[:10],
        })
    return results[:12]


def _cache_key(key: dict) -> str:
    # Keys must not contain spaces ("sde 1"), so use underscores.
    return f"web-exp:{key['company_key']}:{key['role_key']}".replace(" ", "_")


def find_real_experiences(company: str, role: str, refresh: bool = False) -> list[dict] | None:
    """Return cached or fresh results. None means web search isn't configured."""
    if not web_search_enabled():
        return None
    from .insights import normalise

    key = {"company_key": normalise(company), "role_key": normalise(role)}
    redis_key = _cache_key(key)
    if not refresh:
        hit = cache.get(redis_key)
        if hit is not None:
            return hit

    cached = ExperienceSearch.objects.filter(**key).first()
    if cached and not refresh and cached.fetched_at > timezone.now() - timedelta(days=CACHE_DAYS):
        # Warm Redis for the rest of the 3 days, so the next search skips the database too.
        remaining = CACHE_SECONDS - (timezone.now() - cached.fetched_at).total_seconds()
        cache.set(redis_key, cached.results, max(60, int(remaining)))
        return cached.results
    try:
        results = normalise_results(_tavily(f"{company} {role} interview experience"), company)
    except Exception:
        log.exception("Tavily search failed")
        return cached.results if cached else []  # keep old results rather than showing nothing
    ExperienceSearch.objects.update_or_create(**key, defaults={"results": results})
    cache.set(redis_key, results, CACHE_SECONDS)
    return results
