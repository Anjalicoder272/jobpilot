import io
import json
from unittest import mock

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from matching import websearch
from matching.models import ExperienceSearch

TAVILY_RESULTS = {"results": [
    {"title": "Amazon SDE-1 Interview Experience | Bangalore | Offer", "url": "https://leetcode.com/discuss/interview-experience/123",
     "content": "## OA had 2 questions, then 3 rounds: LRU cache, BFS on a grid and LP questions.", "score": 0.91},
    {"title": "Amazon Interview Experience for SDE-1 (On-Campus)", "url": "https://www.geeksforgeeks.org/amazon-interview-experience-sde-1/",
     "content": "Round 1: online test with two coding questions.", "score": 0.88, "published_date": "2026-08-14T10:00:00Z"},
    {"title": "Google L3 interview experience", "url": "https://leetcode.com/discuss/interview-experience/999",
     "content": "Google only, no mention of the other company.", "score": 0.95},          # different company: dropped
    {"title": "Amazon SDE interview tips", "url": "https://random-blog.example.com/amazon", "content": "Amazon", "score": 0.99},  # untrusted site
    {"title": "Amazon SDE-1 Interview Experience | Bangalore | Offer", "url": "https://leetcode.com/discuss/interview-experience/123",
     "content": "duplicate", "score": 0.5},                                                 # duplicate URL: dropped
]}


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def fake_urlopen(*args, **kwargs):
    return FakeResponse(json.dumps(TAVILY_RESULTS).encode())


@pytest.fixture
def client():
    c = APIClient()
    c.post("/api/auth/signup/", {"name": "A", "email": "a@x.com", "password": "strong-pass-123"}, format="json")
    return c


def test_normalise_keeps_only_relevant_trusted_unique_results():
    results = websearch.normalise_results(TAVILY_RESULTS["results"], "Amazon")
    assert [r["site"] for r in results] == ["LeetCode", "GeeksforGeeks"]
    assert results[0]["snippet"].startswith("OA had 2 questions")  # markdown symbols removed
    assert results[1]["published"] == "2026-08-14"


@pytest.mark.django_db
def test_without_a_key_web_experiences_is_null(client):
    data = client.get("/api/insights/?company=Amazon&role=SDE-1").data
    assert data["web_experiences"] is None
    assert data["links"]  # the "search on LeetCode/GFG" buttons are still there


@pytest.mark.django_db
@override_settings(TAVILY_API_KEY="tvly-test")
def test_shows_real_posts_and_sends_the_key_as_a_bearer_header(client):
    with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen) as urlopen:
        data = client.get("/api/insights/?company=Amazon&role=SDE-1").data
    request = urlopen.call_args[0][0]
    assert request.get_header("Authorization") == "Bearer tvly-test"
    body = json.loads(request.data)
    assert "leetcode.com" in body["include_domains"] and "Amazon SDE-1" in body["query"]
    assert [r["site"] for r in data["web_experiences"]] == ["LeetCode", "GeeksforGeeks"]


@pytest.mark.django_db
@override_settings(TAVILY_API_KEY="tvly-test")
def test_results_are_cached_and_kept_when_a_refresh_fails(client):
    with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen) as urlopen:
        client.get("/api/insights/?company=Amazon&role=SDE-1")
        client.get("/api/insights/?company=amazon&role=sde 1")
        assert urlopen.call_count == 1  # second search came from the cache
    with mock.patch("urllib.request.urlopen", side_effect=TimeoutError):
        data = client.post("/api/insights/", {"company": "Amazon", "role": "SDE-1"}, format="json").data
    assert len(data["web_experiences"]) == 2  # old results kept
    assert ExperienceSearch.objects.count() == 1


@pytest.mark.django_db
@override_settings(TAVILY_API_KEY="tvly-test")
def test_ai_status_reports_web_search_without_the_key():
    data = APIClient().get("/api/ai/status/").data
    assert data["web_search"] is True and "tvly" not in str(data)
