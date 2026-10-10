from django.db import models


class CompanyInsight(models.Model):
    """Cached interview insights for a company + role, so repeat searches don't spend AI quota."""

    company_key = models.CharField(max_length=120)  # normalised, e.g. "amazon"
    role_key = models.CharField(max_length=150)     # normalised, e.g. "sde 1"
    company = models.CharField(max_length=120)
    role = models.CharField(max_length=150)
    mode = models.CharField(max_length=10)          # "web", "ai" or "basic"
    data = models.JSONField(default=dict)
    sources = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["company_key", "role_key"], name="one_insight_per_company_role")]

    def __str__(self):
        return f"{self.company} · {self.role} ({self.mode})"


class ExperienceSearch(models.Model):
    """Cached web search results (titles + links to real interview experiences) per company + role."""

    company_key = models.CharField(max_length=120)
    role_key = models.CharField(max_length=150)
    results = models.JSONField(default=list)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["company_key", "role_key"], name="one_search_per_company_role")]
