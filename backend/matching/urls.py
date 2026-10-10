from django.urls import path

from . import views

urlpatterns = [
    path("resume/", views.resume),
    path("resume/check/", views.resume_check),
    path("ai/status/", views.ai_status),
    path("insights/", views.company_insights),
    path("applications/<int:pk>/match/", views.match_application),
    path("applications/<int:pk>/email/", views.email_draft),
    path("applications/<int:pk>/prep/", views.prep_plan),
]
