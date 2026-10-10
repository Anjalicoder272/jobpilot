from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Extra data per user. The resume text powers matching and email writing."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    resume_filename = models.CharField(max_length=200, blank=True)
    resume_text = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    resume_uploaded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user}"

    @classmethod
    def for_user(cls, user):
        profile, _ = cls.objects.get_or_create(user=user)
        return profile
