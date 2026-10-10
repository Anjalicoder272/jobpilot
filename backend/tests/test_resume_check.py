import io
from unittest import mock

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from accounts.models import Profile
from matching import jobpage
from matching.services import verdict_for

RESUME = ("Frontend developer. Skills: JavaScript, TypeScript, React, Next.js, Redux, Node.js, Redis, Git. "
          "Reduced page load time by 45% with Next.js SSR. Built REST APIs.") * 3
JD = ("We need a Frontend Engineer with React, TypeScript, Next.js, GraphQL and Jest experience. "
      "You will build fast pages and write tests.")
PUBLIC_DNS = [(2, 1, 6, "", ("93.184.216.34", 443))]


@pytest.fixture
def client():
    c = APIClient()
    c.post("/api/auth/signup/", {"name": "A", "email": "a@x.com", "password": "strong-pass-123"}, format="json")
    return c


def add_resume(text=RESUME):
    from django.contrib.auth.models import User
    profile = Profile.for_user(User.objects.get(email="a@x.com"))
    profile.resume_text = text
    profile.save()


class FakeResponse(io.BytesIO):
    def __init__(self, body: str, content_type="text/html; charset=utf-8"):
        super().__init__(body.encode())
        self.headers = mock.Mock()
        self.headers.get = lambda key, default=None: content_type if key == "Content-Type" else default
        self.headers.get_content_charset = lambda: "utf-8"

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_verdict_thresholds():
    assert verdict_for(90, []) == "ready"
    assert verdict_for(85, ["GraphQL"]) == "ready"
    assert verdict_for(85, ["GraphQL", "Jest"]) == "almost"
    assert verdict_for(65, []) == "almost"
    assert verdict_for(40, ["a"]) == "needs_work"


@pytest.mark.django_db
def test_check_needs_a_resume_and_a_job(client):
    assert client.post("/api/resume/check/", {"jd_text": JD}, format="json").status_code == 400
    add_resume()
    assert client.post("/api/resume/check/", {"jd_text": "short"}, format="json").status_code == 400


@pytest.mark.django_db
def test_check_with_pasted_description_gives_verdict_and_suggestions(client):
    add_resume()
    data = client.post("/api/resume/check/", {"jd_text": JD}, format="json").data
    assert data["source"] == "basic" and data["verdict"] in {"ready", "almost", "needs_work"}
    assert {"GraphQL", "Jest"} <= set(data["missing"])
    assert any("GraphQL" in s for s in data["suggestions"])


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="k")
def test_ai_check_can_say_ready_to_go(client):
    add_resume()
    fake = {"score": 91, "matched": ["React", "Next.js"], "missing": [], "suggestions": ["Lead with your SSR work"],
            "summary": "Excellent fit."}
    with mock.patch("matching.services._ask_ai", return_value=fake):
        data = client.post("/api/resume/check/", {"jd_text": JD}, format="json").data
    assert data["verdict"] == "ready" and data["source"] == "ai"


@pytest.mark.parametrize("url", [
    "http://localhost:8000/admin/", "http://127.0.0.1/", "http://10.0.0.5/jobs", "http://169.254.169.254/latest",
    "file:///etc/passwd", "ftp://example.com/job",
])
def test_private_and_non_http_urls_are_blocked(url):
    with pytest.raises(jobpage.UnsafeURL):
        jobpage.check_url_is_public(url)


def test_redirects_to_private_addresses_are_blocked():
    handler = jobpage.SafeRedirectHandler()
    with pytest.raises(jobpage.UnsafeURL):
        handler.redirect_request(mock.Mock(), None, 302, "Found", {}, "http://127.0.0.1/secret")


def test_reads_job_posting_from_json_ld():
    page = """<html><head><title>Jobs</title>
    <script type="application/ld+json">{"@type": "JobPosting", "title": "Frontend Engineer",
      "hiringOrganization": {"name": "Acme"}, "description": "<p>React and <b>TypeScript</b></p><li>Next.js</li>"}
    </script></head><body>menu menu</body></html>"""
    opener = mock.Mock()
    opener.open.return_value = FakeResponse(page)
    with mock.patch("socket.getaddrinfo", return_value=PUBLIC_DNS), \
         mock.patch("urllib.request.build_opener", return_value=opener):
        job = jobpage.fetch_job_page("https://jobs.example.com/123")
    assert job["title"] == "Frontend Engineer" and job["company"] == "Acme"
    assert "TypeScript" in job["text"] and "<b>" not in job["text"]


@pytest.mark.django_db
def test_unreadable_job_page_asks_to_paste(client):
    add_resume()
    opener = mock.Mock()
    opener.open.return_value = FakeResponse("<html><body>Please sign in</body></html>")
    with mock.patch("socket.getaddrinfo", return_value=PUBLIC_DNS), \
         mock.patch("urllib.request.build_opener", return_value=opener):
        res = client.post("/api/resume/check/", {"job_url": "https://www.linkedin.com/jobs/view/1"}, format="json")
    assert res.status_code == 400 and "paste" in res.data["detail"].lower()


@pytest.mark.django_db
def test_check_rejects_private_job_links(client):
    add_resume()
    res = client.post("/api/resume/check/", {"job_url": "http://127.0.0.1:8000/admin/"}, format="json")
    assert res.status_code == 400


def test_split_title_from_job_sites():
    assert jobpage.split_title("Software Engineer II (Frontend) at Expedia Group — Gurgaon, India | LinkedIn Jobs") == \
        ("Software Engineer II (Frontend)", "Expedia Group")
    assert jobpage.split_title("Frontend Developer | Careers") == ("Frontend Developer", "")
