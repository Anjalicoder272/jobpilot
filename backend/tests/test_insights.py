from unittest import mock

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

from matching.models import CompanyInsight

WEB_DATA = {
    "overview": "An online assessment followed by three interviews.",
    "rounds": [{"name": "Online assessment", "what": "Two coding problems"}],
    "topics": [{"label": "Leadership Principles", "detail": "Behavioral questions"}],
    "questions": [{"question": "Find the k-th largest element", "type": "coding"}],
    "tips": ["Use the STAR format"],
    "confidence": "high",
}
SOURCES = [{"title": "Amazon SDE-1 interview experience", "url": "https://example.com/a"}]


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def client():
    c = APIClient()
    c.post("/api/auth/signup/", {"name": "A", "email": "a@x.com", "password": "strong-pass-123"}, format="json")
    return c


@pytest.mark.django_db
def test_insights_need_login_and_input(client):
    assert APIClient().get("/api/insights/?company=Amazon&role=SDE-1").status_code == 401
    assert client.get("/api/insights/?company=A&role=").status_code == 400


@pytest.mark.django_db
def test_shows_real_jobpilot_questions_and_links(client):
    client.post("/api/experiences/", {"company": "Amazon", "role": "SDE-1", "summary": "ok",
                                      "questions": [{"text": "Two sum", "topic": "DSA", "difficulty": "EASY"}]},
                format="json")
    data = client.get("/api/insights/?company=amazon&role=SDE-1").data
    assert data["mode"] == "basic"
    assert data["community"][0]["question"] == "Two sum"
    assert {l["site"] for l in data["links"]} >= {"LeetCode Discuss", "GeeksforGeeks", "Glassdoor"}
    assert "questions" not in data and "rounds" not in data  # no AI-made content


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_never_shows_ai_knowledge_questions(client):
    """Even with AI on, if web search (with sources) isn't available we show only real data."""
    with mock.patch("matching.insights._web_insights", side_effect=RuntimeError("429")), \
         mock.patch("matching.services._ask_ai") as ai:
        data = client.get("/api/insights/?company=Amazon&role=SDE-1").data
    assert ai.call_count == 0
    assert data["mode"] == "basic" and "questions" not in data


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_web_mode_is_shown_only_with_sources(client):
    with mock.patch("matching.insights._web_insights", return_value=(WEB_DATA, SOURCES)):
        data = client.get("/api/insights/?company=Amazon&role=SDE-1").data
    assert data["mode"] == "web" and data["sources"] == SOURCES and data["questions"]

    with mock.patch("matching.insights._web_insights", return_value=(WEB_DATA, [])):
        data = client.get("/api/insights/?company=Google&role=SWE").data
    assert data["mode"] == "basic" and "questions" not in data  # no sources = not shown


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_web_results_are_cached_and_kept_if_a_refresh_fails(client):
    with mock.patch("matching.insights._web_insights", return_value=(WEB_DATA, SOURCES)) as web:
        client.get("/api/insights/?company=Amazon&role=SDE-1")
        client.get("/api/insights/?company=  AMAZON &role=sde 1")  # same after normalising
        assert web.call_count == 1
    with mock.patch("matching.insights._web_insights", side_effect=RuntimeError("429")):
        data = client.post("/api/insights/", {"company": "Amazon", "role": "SDE-1"}, format="json").data
    assert data["mode"] == "web" and data["sources"] == SOURCES
    assert CompanyInsight.objects.count() == 1


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_web_search_is_not_retried_after_a_rejection(client):
    with mock.patch("matching.insights._web_insights", side_effect=RuntimeError("429")) as web:
        client.get("/api/insights/?company=Amazon&role=SDE-1")
        client.get("/api/insights/?company=Google&role=SWE")
    assert web.call_count == 1


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_prep_plan_uses_only_sourced_web_questions(client):
    with mock.patch("matching.insights._web_insights", return_value=(WEB_DATA, SOURCES)):
        client.get("/api/insights/?company=Amazon&role=SDE-1")
    app_id = client.post("/api/applications/", {"company": "Amazon", "role": "SDE-1"}, format="json").data["id"]
    with override_settings(GEMINI_API_KEY=""):  # basic plan
        plan = client.post(f"/api/applications/{app_id}/prep/").data["plan"]
    assert {q["question"]: q["source"] for q in plan["likely_questions"]} == {"Find the k-th largest element": "online"}
