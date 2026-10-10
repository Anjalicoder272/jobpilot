import pytest
from rest_framework.test import APIClient

from applications.models import Application
from experiences.models import Experience


@pytest.fixture
def client():
    return APIClient()


def signup(client, email="a@example.com"):
    return client.post("/api/auth/signup/", {"name": "Anjali", "email": email, "password": "strong-pass-123"},
                       format="json")


@pytest.mark.django_db
def test_signup_sets_httponly_cookie_and_me_works(client):
    res = signup(client)
    assert res.status_code == 201
    assert res.cookies["access"]["httponly"]
    assert client.get("/api/auth/me/").data["email"] == "a@example.com"


@pytest.mark.django_db
def test_applications_require_login(client):
    assert client.get("/api/applications/").status_code == 401


@pytest.mark.django_db
def test_create_and_move_application(client):
    signup(client)
    a = client.post("/api/applications/", {"company": "Acme", "role": "Frontend Dev"}, format="json").data
    b = client.post("/api/applications/", {"company": "acme", "role": "SDE-1"}, format="json").data
    # Same company name in a different case reuses the company.
    assert a["company_slug"] == b["company_slug"] == "acme"
    # The newest card is on top of the Applied column.
    assert Application.objects.get(pk=b["id"]).position == 0

    moved = client.post(f"/api/applications/{a['id']}/move/", {"status": "INTERVIEW", "index": 0}, format="json")
    assert moved.status_code == 200
    assert moved.data["status"] == "INTERVIEW"
    assert Application.objects.get(pk=a["id"]).history.count() == 2
    assert client.get("/api/applications/stats/").data["INTERVIEW"] == 1


@pytest.mark.django_db
def test_users_cannot_see_each_others_applications(client):
    signup(client, "one@example.com")
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Dev"}, format="json").data["id"]
    other = APIClient()
    signup(other, "two@example.com")
    assert other.get(f"/api/applications/{app_id}/").status_code == 404


@pytest.mark.django_db
def test_experiences_are_public_and_paginated(client):
    signup(client)
    for i in range(10):
        client.post("/api/experiences/", {
            "company": "Acme", "role": f"Role {i}", "summary": "Good process",
            "questions": [{"text": "What is a closure?", "topic": "JAVASCRIPT", "difficulty": "EASY"}],
        }, format="json")
    anon = APIClient()
    page1 = anon.get("/api/experiences/").data
    assert len(page1["results"]) == 8 and page1["next"]
    page2 = anon.get(page1["next"]).data
    assert len(page2["results"]) == 2 and page2["next"] is None
    assert anon.get("/api/experiences/topics/").data[0] == {"topic": "JAVASCRIPT", "label": "JavaScript", "count": 10}


@pytest.mark.django_db
def test_experience_needs_at_least_one_question(client):
    signup(client)
    res = client.post("/api/experiences/", {"company": "Acme", "role": "Dev", "summary": "x", "questions": []},
                      format="json")
    assert res.status_code == 400
    assert Experience.objects.count() == 0


@pytest.mark.django_db
def test_health_check_is_public(client):
    assert client.get("/api/health/").json() == {"status": "ok"}
