from django.urls import path

from . import views

urlpatterns = [
    path("signup/", views.signup),
    path("login/", views.login),
    path("refresh/", views.refresh),
    path("logout/", views.logout),
    path("me/", views.me),
]
