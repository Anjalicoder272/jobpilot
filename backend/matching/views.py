from django.conf import settings
from django.utils import timezone
from pypdf.errors import PdfReadError
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import Profile

from . import services
from .skills import extract_skills

MAX_RESUME_BYTES = 2 * 1024 * 1024  # 2 MB


def resume_payload(profile):
    return {
        "filename": profile.resume_filename,
        "skills": profile.skills,
        "characters": len(profile.resume_text),
        "uploaded_at": profile.resume_uploaded_at,
        "has_resume": bool(profile.resume_text),
    }


@api_view(["GET", "POST", "DELETE"])
@parser_classes([MultiPartParser])
def resume(request):
    """GET: resume summary · POST: upload a PDF (field "file") · DELETE: remove it."""
    profile = Profile.for_user(request.user)

    if request.method == "POST":
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Choose a PDF file to upload."}, status=status.HTTP_400_BAD_REQUEST)
        if not upload.name.lower().endswith(".pdf"):
            return Response({"detail": "Only PDF files are supported."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_RESUME_BYTES:
            return Response({"detail": "The file is larger than 2 MB."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            text = services.extract_pdf_text(upload)
        except (PdfReadError, ValueError):
            return Response({"detail": "This PDF couldn't be read. Try exporting it again."},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(text) < 100:
            return Response({"detail": "No text found in this PDF. Scanned images can't be read; "
                                       "please upload a text-based PDF."}, status=status.HTTP_400_BAD_REQUEST)
        profile.resume_filename = upload.name[:200]
        profile.resume_text = text
        profile.skills = extract_skills(text)
        profile.resume_uploaded_at = timezone.now()
        profile.save()

    elif request.method == "DELETE":
        profile.resume_filename = ""
        profile.resume_text = ""
        profile.skills = []
        profile.resume_uploaded_at = None
        profile.save()

    return Response(resume_payload(profile))


@api_view(["GET"])
@permission_classes([AllowAny])
def ai_status(request):
    """Tells the UI whether AI is on, and which provider, without exposing any key."""
    from .embeddings import embeddings_enabled

    return Response({
        "enabled": services.ai_enabled(),
        "provider": services.ai_provider(),
        "model": services.ai_model_name(),
        "smart_search": embeddings_enabled(),
        "web_search": bool(settings.TAVILY_API_KEY),
    })


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def match_application(request, pk):
    """Compare the user's resume with one application's job description and store the result."""
    from applications.models import Application
    from applications.serializers import ApplicationSerializer

    app = Application.objects.filter(user=request.user, pk=pk).select_related("company").first()
    if app is None:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    profile = Profile.for_user(request.user)
    if not profile.resume_text:
        return Response({"detail": "Upload your resume first (Job Match page)."}, status=status.HTTP_400_BAD_REQUEST)
    if len(app.jd_text.strip()) < 50:
        return Response({"detail": "Paste the job description into this application first."},
                        status=status.HTTP_400_BAD_REQUEST)

    result = services.match_resume(profile.resume_text, app.jd_text)
    app.match_score = result["score"]
    app.matched_skills = result["matched"]
    app.missing_skills = result["missing"]
    app.match_summary = result["summary"]
    app.match_source = result["source"]
    app.save(update_fields=["match_score", "matched_skills", "missing_skills", "match_summary", "match_source"])
    return Response(ApplicationSerializer(app).data)


match_application.cls.throttle_scope = "ai"


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def email_draft(request, pk):
    """Draft a cold email for one application, using only facts from the user's resume. Nothing is sent."""
    from applications.models import Application

    app = Application.objects.filter(user=request.user, pk=pk).select_related("company").first()
    if app is None:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    profile = Profile.for_user(request.user)
    if not profile.resume_text:
        return Response({"detail": "Upload your resume first (Job Match page)."}, status=status.HTTP_400_BAD_REQUEST)

    draft = services.draft_email(
        name=request.user.first_name or "Your name",
        company=app.company.name,
        role=app.role,
        hr_name=app.hr_name,
        resume_text=profile.resume_text,
        jd_text=app.jd_text,
        matched=app.matched_skills,
    )
    return Response({**draft, "to": app.hr_email})


email_draft.cls.throttle_scope = "ai"


@api_view(["GET", "POST"])
@throttle_classes([ScopedRateThrottle])
def prep_plan(request, pk):
    """GET: the saved plan (or null) · POST: generate a new "Prepare me" plan for this application."""
    from django.utils import timezone

    from applications.models import Application

    from .prep import build_prep_plan

    app = Application.objects.filter(user=request.user, pk=pk).select_related("company").first()
    if app is None:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "POST":
        app.prep_plan = build_prep_plan(app, Profile.for_user(request.user).resume_text)
        app.prep_generated_at = timezone.now()
        app.save(update_fields=["prep_plan", "prep_generated_at"])
    return Response({"plan": app.prep_plan, "generated_at": app.prep_generated_at})


prep_plan.cls.throttle_scope = "ai"


@api_view(["GET", "POST"])
@throttle_classes([ScopedRateThrottle])
def company_insights(request):
    """GET ?company=Amazon&role=SDE-1 → insights (cached for 7 days). POST {company, role} → refresh."""
    from .insights import get_insights, insight_payload

    source = request.data if request.method == "POST" else request.query_params
    company, role = str(source.get("company", "")).strip(), str(source.get("role", "")).strip()
    if len(company) < 2 or len(role) < 2:
        return Response({"detail": "Enter a company and a job title."}, status=status.HTTP_400_BAD_REQUEST)
    refresh = request.method == "POST"
    insight = get_insights(company, role, refresh=refresh)
    return Response(insight_payload(insight, refresh_web=refresh))


company_insights.cls.throttle_scope = "ai"


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def resume_check(request):
    """Check the user's resume against a job link or pasted description. Nothing is saved."""
    from .jobpage import fetch_job_page

    profile = Profile.for_user(request.user)
    if not profile.resume_text:
        return Response({"detail": "Upload your resume first."}, status=status.HTTP_400_BAD_REQUEST)

    job_url = str(request.data.get("job_url", "")).strip()
    jd_text = str(request.data.get("jd_text", "")).strip()
    page = {"title": "", "company": ""}
    if not jd_text and job_url:
        try:
            page = fetch_job_page(job_url)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        jd_text = page["text"]
    if len(jd_text) < 80:
        return Response({"detail": "Add a job link or paste the job description (a few lines at least)."},
                        status=status.HTTP_400_BAD_REQUEST)

    result = services.check_resume(profile.resume_text, jd_text)
    return Response({**result, "job": {"title": page["title"], "company": page["company"],
                                       "url": job_url, "description": jd_text[:12_000]}})


resume_check.cls.throttle_scope = "ai"
