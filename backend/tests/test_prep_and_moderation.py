from unittest import mock

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from applications.models import Application
from experiences.ai import basic_extract, redact_personal_info
from experiences.models import Experience

NOTES = """Round 1 (online test)
1. Find the longest substring without repeating characters
2. Merge overlapping intervals
Round 2 was with a senior dev. He asked: What is the difference between useMemo and useCallback?
Then: how would you design an infinite scrolling feed?
Q: Tell me about a production bug you fixed."""


@pytest.fixture
def client():
    c = APIClient()
    c.post("/api/auth/signup/", {"name": "Anjali", "email": "a@example.com", "password": "strong-pass-123"},
           format="json")
    return c


def share(client, company="Acme", role="Frontend Developer", summary="Smooth process.", questions=None):
    return client.post("/api/experiences/", {
        "company": company, "role": role, "summary": summary,
        "questions": questions or [{"text": "Implement debounce", "topic": "JAVASCRIPT", "difficulty": "MEDIUM"}],
    }, format="json")


def test_basic_extract_finds_and_tags_questions():
    qs = basic_extract(NOTES)
    texts = [q["text"] for q in qs]
    assert "Merge overlapping intervals" in texts
    by_text = {q["text"]: q for q in qs}
    assert by_text["Merge overlapping intervals"]["topic"] == "DSA"
    assert by_text["What is the difference between useMemo and useCallback?"]["topic"] == "REACT"
    assert by_text["Tell me about a production bug you fixed."]["topic"] == "BEHAVIORAL"
    assert "Round 1 (online test)" not in texts  # headings are not questions


@pytest.mark.django_db
def test_extract_endpoint_basic_and_ai(client):
    res = client.post("/api/experiences/extract/", {"notes": NOTES}, format="json")
    assert res.status_code == 200 and res.data["source"] == "basic" and len(res.data["questions"]) >= 5

    fake = {"questions": [{"text": "Merge intervals", "topic": "DSA", "difficulty": "MEDIUM"},
                          {"text": "Explain closures", "topic": "NOT_A_TOPIC", "difficulty": "EASY"}]}
    with override_settings(GEMINI_API_KEY="k"), mock.patch("experiences.ai._ask_ai", return_value=fake):
        res = client.post("/api/experiences/extract/", {"notes": NOTES}, format="json")
    assert res.data["source"] == "ai"
    assert res.data["questions"][1]["topic"] == "JAVASCRIPT"  # an invalid AI topic is replaced by our guess


def test_redact_personal_info():
    text = "Mail the HR at priya.hr@acme.com or call +91 98765 43210 / 9876543210."
    clean = redact_personal_info(text)
    assert "@" not in clean and "98765" not in clean
    assert clean.count("[phone removed]") == 2 and "[email removed]" in clean


@pytest.mark.django_db
def test_shared_experience_is_redacted_and_published(client):
    res = share(client, summary="The HR (hr@acme.com, 9876543210) was friendly.")
    assert res.status_code == 201 and res.data["is_published"]
    assert "hr@acme.com" not in res.data["summary"] and "9876543210" not in res.data["summary"]


@pytest.mark.django_db
def test_spam_is_held_for_review_and_hidden(client):
    res = share(client, summary="Join our channel on telegram group for paid referral https://spam.example")
    assert res.status_code == 201 and res.data["is_published"] is False and res.data["moderation_note"]
    assert APIClient().get("/api/experiences/").data["results"] == []


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_ai_moderation_can_flag_a_post(client):
    with mock.patch("experiences.ai._ask_ai", return_value={"ok": False, "reason": "Abusive language"}):
        res = share(client)
    assert res.data["is_published"] is False and res.data["moderation_note"] == "Abusive language"
    assert Experience.objects.get().is_published is False


@pytest.mark.django_db
def test_prep_plan_uses_real_questions_for_the_company(client):
    share(client, company="Acme", role="Frontend Developer", questions=[
        {"text": "Implement debounce", "topic": "JAVASCRIPT", "difficulty": "MEDIUM"},
        {"text": "Explain the event loop", "topic": "JAVASCRIPT", "difficulty": "MEDIUM"},
        {"text": "Design an infinite feed", "topic": "SYSTEM_DESIGN", "difficulty": "HARD"},
    ])
    share(client, company="Other Co", questions=[{"text": "Unrelated question", "topic": "DSA", "difficulty": "EASY"}])
    app_id = client.post("/api/applications/", {"company": "acme", "role": "Frontend Engineer"}, format="json").data["id"]

    assert client.get(f"/api/applications/{app_id}/prep/").data["plan"] is None
    plan = client.post(f"/api/applications/{app_id}/prep/").data["plan"]
    assert plan["source"] == "basic" and plan["based_on"] == 3
    assert plan["focus_topics"][0]["topic"] == "JAVASCRIPT"
    questions = [q["question"] for q in plan["likely_questions"]]
    assert "Implement debounce" in questions and "Unrelated question" not in questions
    assert all(q["source"] == "real" for q in plan["likely_questions"])
    assert len(plan["days"]) == 3
    assert client.get(f"/api/applications/{app_id}/prep/").data["plan"] == plan  # saved


@pytest.mark.django_db
def test_prep_plan_without_shared_experiences_falls_back_to_the_jd(client):
    app_id = client.post("/api/applications/", {"company": "NewCo", "role": "Frontend",
                                                "jd_text": "React, TypeScript and system design experience"},
                         format="json").data["id"]
    plan = client.post(f"/api/applications/{app_id}/prep/").data["plan"]
    assert plan["based_on"] == 0 and plan["likely_questions"] == []
    assert {f["topic"] for f in plan["focus_topics"]} & {"REACT", "JAVASCRIPT", "SYSTEM_DESIGN"}


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_ai_prep_plan_cannot_fake_real_questions(client):
    share(client, company="Acme", questions=[{"text": "Implement debounce", "topic": "JAVASCRIPT", "difficulty": "MEDIUM"}])
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Frontend"}, format="json").data["id"]
    fake = {
        "focus_topics": [{"label": "JavaScript", "why": "Asked before"}],
        "likely_questions": [{"question": "Implement debounce", "source": "real"},
                             {"question": "Invented question", "source": "real"}],  # AI wrongly claims "real"
        "days": [{"day": 1, "title": "JS", "tasks": ["Revise closures"]}],
        "tips": ["Be concise"],
    }
    with mock.patch("matching.prep._ask_ai", return_value=fake):
        plan = client.post(f"/api/applications/{app_id}/prep/").data["plan"]
    sources = {q["question"]: q["source"] for q in plan["likely_questions"]}
    assert sources == {"Implement debounce": "real", "Invented question": "suggested"}
    assert plan["source"] == "ai"
