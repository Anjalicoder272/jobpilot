from unittest import mock

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from experiences.models import Experience, Question


def signup(client, email):
    client.post("/api/auth/signup/", {"name": "User", "email": email, "password": "strong-pass-123"}, format="json")
    return client


def share(client, company, text, topic="JAVASCRIPT"):
    return client.post("/api/experiences/", {
        "company": company, "role": "Frontend", "summary": "ok",
        "questions": [{"text": text, "topic": topic, "difficulty": "MEDIUM"}],
    }, format="json").data


@pytest.mark.django_db
def test_vote_toggles_and_counts_per_user():
    a, b = signup(APIClient(), "a@x.com"), signup(APIClient(), "b@x.com")
    qid = share(a, "Acme", "Implement debounce")["questions"][0]["id"]

    assert APIClient().post(f"/api/questions/{qid}/vote/").status_code == 401  # must be logged in
    assert a.post(f"/api/questions/{qid}/vote/").data == {"votes": 1, "voted": True}
    assert b.post(f"/api/questions/{qid}/vote/").data == {"votes": 2, "voted": True}
    assert a.post(f"/api/questions/{qid}/vote/").data == {"votes": 1, "voted": False}  # toggled off

    q = b.get("/api/experiences/").data["results"][0]["questions"][0]
    assert q["votes"] == 1 and q["voted"] is True
    assert a.get("/api/experiences/").data["results"][0]["questions"][0]["voted"] is False


@pytest.mark.django_db
def test_prep_plan_lists_most_voted_questions_first():
    a = signup(APIClient(), "a@x.com")
    data = a.post("/api/experiences/", {"company": "Acme", "role": "Frontend", "summary": "ok", "questions": [
        {"text": "Rarely asked", "topic": "DSA", "difficulty": "EASY"},
        {"text": "Asked all the time", "topic": "REACT", "difficulty": "MEDIUM"},
    ]}, format="json").data
    a.post(f"/api/questions/{data['questions'][1]['id']}/vote/")
    app_id = a.post("/api/applications/", {"company": "Acme", "role": "Frontend"}, format="json").data["id"]
    plan = a.post(f"/api/applications/{app_id}/prep/").data["plan"]
    assert plan["likely_questions"][0]["question"] == "Asked all the time"


def fake_embed(texts, task="RETRIEVAL_DOCUMENT"):
    """Tiny fake 'meaning' space: caching-related texts point one way, everything else another."""
    return [[1.0, 0.1] if any(w in t.lower() for w in ("cach", "redis", "ttl")) else [0.1, 1.0] for t in texts]


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_smart_search_finds_by_meaning():
    a = signup(APIClient(), "a@x.com")
    with mock.patch("matching.embeddings.embed_texts", side_effect=fake_embed), \
         mock.patch("experiences.ai._ask_ai", return_value={"ok": True}):
        share(a, "Acme", "How would you set a TTL on Redis keys?", "BACKEND")
        share(a, "Other", "Center a div three ways", "CSS")
    assert Question.objects.filter(embedding__isnull=False).count() == 2

    with mock.patch("experiences.views.embed_texts", side_effect=fake_embed):
        # "caching" shares no words with "TTL on Redis keys", but means something close.
        res = APIClient().get("/api/experiences/?search=caching&smart=1").data
    assert res["smart"] is True
    assert [e["company"] for e in res["results"]] == ["Acme"]


@pytest.mark.django_db
def test_smart_search_needs_gemini_key():
    res = APIClient().get("/api/experiences/?search=caching&smart=1")
    assert res.status_code == 400


@pytest.mark.django_db
def test_flagged_posts_are_not_embedded_or_votable():
    a = signup(APIClient(), "a@x.com")
    qid = share(a, "Acme", "Join my telegram group https://spam.example")["questions"][0]["id"]
    assert Experience.objects.get().is_published is False
    assert a.post(f"/api/questions/{qid}/vote/").status_code == 404
