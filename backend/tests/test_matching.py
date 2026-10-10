from datetime import timedelta
from unittest import mock

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from applications.models import Application
from matching import services
from matching.skills import extract_skills

RESUME = """Anjali Sharma - Frontend Developer
Skills: JavaScript, TypeScript, React.js, Next.js, Redux, Node.js, PostgreSQL, Redis, Docker, Git
- Revamped Next.js architecture, reducing initial page load time by 45%
- Built a Redis caching layer, improving response times from 800ms to under 120ms
- Implemented infinite scroll with the Intersection Observer API
""" * 2

JD = """We are hiring a Frontend Engineer with 2+ years of experience in React, TypeScript and Next.js.
You will work on SSR, Core Web Vitals and GraphQL APIs. Knowledge of Jest testing is a plus."""

NO_AI = override_settings(ANTHROPIC_API_KEY="", GEMINI_API_KEY="")


def make_pdf(text: str) -> bytes:
    """Build a tiny valid PDF containing the given text (one line per row)."""
    lines = text.strip().splitlines()[:40]
    content = "BT /F1 10 Tf 40 800 Td 12 TL " + " ".join(
        "(" + l.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") '" for l in lines
    ) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{obj}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return out.encode("latin-1")


@pytest.fixture
def client():
    c = APIClient()
    c.post("/api/auth/signup/", {"name": "Anjali Sharma", "email": "a@example.com", "password": "strong-pass-123"},
           format="json")
    return c


def with_resume(client, text=RESUME):
    profile = Profile.for_user(Application._meta.get_field("user").related_model.objects.get(email="a@example.com"))
    profile.resume_text = text
    profile.save()


def test_extract_skills_handles_aliases():
    skills = extract_skills("Built apps in ReactJS, NextJS and Node with Postgres; JS/TS daily. Not React Native.")
    assert {"React", "Next.js", "Node.js", "PostgreSQL", "JavaScript", "TypeScript"} <= set(skills)
    assert "Java" not in extract_skills("JavaScript developer")
    # "Next.js" / "Node.js" must not count as JavaScript on their own.
    assert "JavaScript" not in extract_skills("Experience with Next.js and Node.js")


def test_basic_match_lists_matched_and_missing_skills():
    result = services.basic_match(RESUME, JD)
    assert {"React", "TypeScript", "Next.js"} <= set(result["matched"])
    assert {"GraphQL", "Jest"} <= set(result["missing"])
    assert 0 < result["score"] < 100 and result["source"] == "basic"


@pytest.mark.django_db
def test_resume_upload_extracts_text_and_skills(client):
    pdf = SimpleUploadedFile("resume.pdf", make_pdf(RESUME), content_type="application/pdf")
    res = client.post("/api/resume/", {"file": pdf}, format="multipart")
    assert res.status_code == 200, res.data
    assert res.data["has_resume"] and "React" in res.data["skills"]
    assert client.get("/api/resume/").data["filename"] == "resume.pdf"


@pytest.mark.django_db
def test_resume_upload_rejects_non_pdf(client):
    res = client.post("/api/resume/", {"file": SimpleUploadedFile("cv.docx", b"hello")}, format="multipart")
    assert res.status_code == 400


@pytest.mark.django_db
@NO_AI
def test_match_needs_resume_and_jd_then_saves_result(client):
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Frontend", "jd_text": JD},
                         format="json").data["id"]
    assert client.post(f"/api/applications/{app_id}/match/").status_code == 400  # no resume yet
    with_resume(client)
    res = client.post(f"/api/applications/{app_id}/match/")
    assert res.status_code == 200
    assert res.data["match_source"] == "basic" and res.data["match_score"] > 0
    assert Application.objects.get(pk=app_id).missing_skills


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key", ANTHROPIC_API_KEY="")
def test_match_uses_ai_when_a_key_is_set_and_falls_back_on_errors(client):
    with_resume(client)
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Frontend", "jd_text": JD},
                         format="json").data["id"]
    fake = {"score": 81, "matched": ["React"], "missing": ["GraphQL"], "summary": "Strong React fit."}
    with mock.patch("matching.services._ask_ai", return_value=fake):
        res = client.post(f"/api/applications/{app_id}/match/")
    assert res.data["match_source"] == "ai" and res.data["match_score"] == 81

    with mock.patch("matching.services._ask_ai", side_effect=TimeoutError):
        res = client.post(f"/api/applications/{app_id}/match/")
    assert res.data["match_source"] == "basic"  # the user still gets a result


@pytest.mark.django_db
@override_settings(GEMINI_API_KEY="test-key", ANTHROPIC_API_KEY="")
def test_ai_status_never_exposes_the_key(client):
    data = APIClient().get("/api/ai/status/").data
    assert data["enabled"] and data["provider"] == "gemini"
    assert "test-key" not in str(data)


@pytest.mark.django_db
@NO_AI
def test_email_draft_is_grounded_in_resume(client):
    with_resume(client)
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Frontend Engineer",
                                                "hr_name": "Priya Verma", "hr_email": "priya@acme.com"},
                         format="json").data["id"]
    data = client.post(f"/api/applications/{app_id}/email/").data
    assert data["subject"] == "Application: Frontend Engineer"  # short, no candidate name
    assert data["body"].startswith("Hi Priya,")
    assert "45%" in data["body"]  # a real number from the resume
    assert data["to"] == "priya@acme.com"


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_followup_reminders_send_once_per_day(client):
    app_id = client.post("/api/applications/", {"company": "Acme", "role": "Frontend"}, format="json").data["id"]
    Application.objects.filter(pk=app_id).update(follow_up_on=timezone.localdate() - timedelta(days=1))
    call_command("send_followup_reminders")
    assert len(mail.outbox) == 1 and "Frontend at Acme" in mail.outbox[0].body
    call_command("send_followup_reminders")
    assert len(mail.outbox) == 1  # not sent twice on the same day
