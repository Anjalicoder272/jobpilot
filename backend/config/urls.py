from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from applications.views import ApplicationViewSet, CompanyViewSet
from experiences.views import ExperienceViewSet, QuestionVoteView

router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="application")
router.register("companies", CompanyViewSet, basename="company")
router.register("experiences", ExperienceViewSet, basename="experience")

def health(request):
    """Used by Render's health check (plain HTTP inside Render, so it's exempt from the HTTPS redirect)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health/", health),
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/questions/<int:pk>/vote/", QuestionVoteView.as_view({"post": "vote"})),
    path("api/", include("matching.urls")),
    path("api/", include(router.urls)),
]
