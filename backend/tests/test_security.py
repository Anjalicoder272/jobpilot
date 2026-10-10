import socket
from unittest import mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from applications.models import Company
from matching import jobpage


def signup(client, email="s@example.com", name="Anjali Sharma"):
    return client.post("/api/auth/signup/", {"name": name, "email": email, "password": "strong-pass-123"},
                       format="json")


@pytest.fixture
def client():
    c = APIClient()
    signup(c)
    return c


@pytest.mark.django_db
def test_unsafe_requests_without_the_csrf_header_are_rejected():
    forged = APIClient(HTTP_X_REQUESTED_WITH="")
    signup(APIClient())
    res = forged.post("/api/auth/login/", {"email": "s@example.com", "password": "strong-pass-123"}, format="json")
    assert res.status_code == 403
    assert forged.get("/api/experiences/").status_code == 200


@pytest.mark.django_db
def test_logout_revokes_the_refresh_token(client):
    refresh = client.cookies["refresh"].value
    assert client.post("/api/auth/logout/").status_code == 204
    replay = APIClient()
    replay.cookies["refresh"] = refresh
    assert replay.post("/api/auth/refresh/").status_code == 401


@pytest.mark.django_db
def test_refresh_fails_for_a_disabled_user(client):
    from django.contrib.auth.models import User
    User.objects.filter(email="s@example.com").update(is_active=False)
    assert client.post("/api/auth/refresh/").status_code == 401


@pytest.mark.django_db
def test_stale_access_cookie_does_not_block_login_or_public_pages():
    signup(APIClient())
    c = APIClient()
    c.cookies["access"] = "not-a-jwt"
    assert c.get("/api/experiences/").status_code == 200
    assert c.post("/api/auth/login/", {"email": "s@example.com", "password": "strong-pass-123"},
                  format="json").status_code == 200


@pytest.mark.django_db
def test_login_is_rate_limited_per_ip():
    c = APIClient()
    codes = [c.post("/api/auth/login/", {"email": "x@example.com", "password": f"guess-{i}"}, format="json").status_code
             for i in range(12)]
    assert codes[0] == 401 and codes[-1] == 429


@pytest.mark.django_db
def test_password_similar_to_email_is_rejected():
    res = APIClient().post("/api/auth/signup/", {"name": "Ravi", "email": "ravikumar99@example.com",
                                                 "password": "ravikumar99"}, format="json")
    assert res.status_code == 400 and "password" in res.data


@pytest.mark.django_db
def test_company_names_with_the_same_slug_do_not_crash(client):
    for name in ["OLX", "O.L.X", "Acme!", "acme"]:
        assert client.post("/api/applications/", {"company": name, "role": "Dev"}, format="json").status_code == 201
    assert Company.objects.filter(name__iexact="acme").count() == 1
    assert client.post("/api/applications/", {"company": "!!!", "role": "Dev"}, format="json").status_code == 400


@pytest.mark.django_db
def test_application_text_fields_are_bounded(client):
    res = client.post("/api/applications/", {"company": "Acme", "role": "Dev", "notes": "x" * 6000}, format="json")
    assert res.status_code == 400


@pytest.mark.django_db
def test_only_the_first_name_is_public(client):
    client.post("/api/experiences/", {"company": "Acme", "role": "Dev", "summary": "Two rounds.",
                                      "questions": [{"text": "What is a closure?", "topic": "JAVASCRIPT",
                                                     "difficulty": "EASY"}]}, format="json")
    assert APIClient().get("/api/experiences/").data["results"][0]["author"] == "Anjali"


@pytest.mark.django_db
def test_experience_posts_are_bounded(client):
    base = {"company": "Acme", "role": "Dev", "summary": "ok"}
    q = {"topic": "OTHER", "difficulty": "EASY"}
    too_many_rounds = client.post("/api/experiences/", {**base, "rounds": 30000,
                                                        "questions": [{**q, "text": "Why React?"}]}, format="json")
    too_many_questions = client.post("/api/experiences/", {**base, "questions": [
        {**q, "text": f"Question number {i}?"} for i in range(31)]}, format="json")
    assert too_many_rounds.status_code == 400 and too_many_questions.status_code == 400


@pytest.mark.django_db
def test_links_in_posts_are_held_for_review(client):
    res = client.post("/api/experiences/", {"company": "Acme", "role": "Dev", "summary": "Join www.spam.example",
                                            "questions": [{"text": "Why React?", "topic": "REACT",
                                                           "difficulty": "EASY"}]}, format="json")
    assert res.status_code == 201 and res.data["is_published"] is False


@pytest.mark.django_db
def test_vote_toggles_and_is_counted_once(client):
    client.post("/api/experiences/", {"company": "Acme", "role": "Dev", "summary": "ok",
                                      "questions": [{"text": "Why React?", "topic": "REACT", "difficulty": "EASY"}]},
                format="json")
    qid = client.get("/api/experiences/").data["results"][0]["questions"][0]["id"]
    assert client.post(f"/api/questions/{qid}/vote/").data == {"votes": 1, "voted": True}
    assert client.post(f"/api/questions/{qid}/vote/").data == {"votes": 0, "voted": False}


@pytest.mark.django_db
@pytest.mark.parametrize("body", [b"not a pdf at all", b"%PDF-1.4\n" + b"\x00junk" * 100])
def test_bad_pdfs_are_rejected_cleanly(client, body):
    res = client.post("/api/resume/", {"file": SimpleUploadedFile("cv.pdf", body)}, format="multipart")
    assert res.status_code == 400


@pytest.mark.django_db
def test_oversized_requests_are_refused_before_parsing(client):
    big = SimpleUploadedFile("cv.pdf", b"%PDF-" + b"0" * (4 * 1024 * 1024))
    assert client.post("/api/resume/", {"file": big}, format="multipart").status_code == 413


@pytest.mark.django_db
def test_reading_a_saved_prep_plan_does_not_use_ai_quota(client):
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Dev"}, format="json").data["id"]
    with mock.patch("rest_framework.throttling.ScopedRateThrottle.THROTTLE_RATES", {"ai": "1/hour"}):
        codes = [client.get(f"/api/applications/{app_id}/prep/").status_code for _ in range(3)]
    assert codes == [200, 200, 200]


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.5", "169.254.169.254", "100.64.0.1",
                                     "::1", "::ffff:169.254.169.254", "fd00::1"])
def test_job_links_to_internal_addresses_are_blocked(address):
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    with mock.patch("socket.getaddrinfo", return_value=[(family, 1, 6, "", (address, 443))]):
        with pytest.raises(jobpage.UnsafeURL):
            jobpage.check_url_is_public("https://internal.example.com/")


@pytest.mark.parametrize("url", ["https://user:pw@example.com/", "https://example.com:6379/", "file:///etc/passwd"])
def test_unusual_job_links_are_blocked(url):
    with mock.patch("socket.getaddrinfo", return_value=[(socket.AF_INET, 1, 6, "", ("93.184.216.34", 443))]):
        with pytest.raises(jobpage.UnsafeURL):
            jobpage.check_url_is_public(url)


def test_dns_rebinding_is_caught_at_connect_time():
    sock = mock.Mock()
    sock.getpeername.return_value = ("127.0.0.1", 443)
    with pytest.raises(jobpage.UnsafeURL):
        jobpage._verify_peer(sock)


def test_unknown_charset_does_not_crash():
    assert jobpage._decode(b"hello", "x-made-up") == "hello"
