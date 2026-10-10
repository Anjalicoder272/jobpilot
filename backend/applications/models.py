from django.conf import settings
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from django.utils.text import slugify


class Company(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "companies"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.unique_slug(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @staticmethod
    def clean_name(name: str) -> str:
        return " ".join(str(name).split())[:120]

    @classmethod
    def unique_slug(cls, name: str) -> str:
        """ "OLX" and "O.L.X" both slugify to "olx", and "!!!" to "", so add a numeric suffix when taken."""
        base = slugify(name)[:120] or "company"
        slug, n = base, 2
        while cls.objects.filter(slug=slug).exists():
            slug, n = f"{base}-{n}", n + 1
        return slug

    @classmethod
    def get_or_create_by_name(cls, name):
        """Find a company case-insensitively, or create it. Safe when two requests create it at once."""
        name = cls.clean_name(name)
        company = cls.objects.filter(name__iexact=name).first()
        if company:
            return company
        try:
            with transaction.atomic():
                return cls.objects.create(name=name)
        except IntegrityError:  # another request created it (or took the slug) in the meantime
            company = cls.objects.filter(name__iexact=name).first()
            if company:
                return company
            with transaction.atomic():
                return cls.objects.create(name=name, slug=cls.unique_slug(name))


class Application(models.Model):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        HR_REPLIED = "HR_REPLIED", "HR Replied"
        INTERVIEW = "INTERVIEW", "Interview"
        OFFER = "OFFER", "Offer"
        REJECTED = "REJECTED", "Rejected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="applications")
    role = models.CharField(max_length=150)
    location = models.CharField(max_length=120, blank=True)
    job_url = models.URLField(blank=True)
    jd_text = models.TextField("Job description", blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    # Order of the card inside its Kanban column (0 = top).
    position = models.PositiveIntegerField(default=0)
    hr_name = models.CharField(max_length=120, blank=True)
    hr_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    applied_on = models.DateField(default=timezone.localdate)
    follow_up_on = models.DateField(null=True, blank=True)
    # Resume match results (see matching/services.py).
    match_score = models.PositiveSmallIntegerField(null=True, blank=True)
    matched_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    match_summary = models.TextField(blank=True)
    match_source = models.CharField(max_length=10, blank=True, help_text='"ai" or "basic"')
    # Cached "Prepare me" plan (see matching/prep.py).
    prep_plan = models.JSONField(null=True, blank=True)
    prep_generated_at = models.DateTimeField(null=True, blank=True)
    # Last day a follow-up reminder email was sent, so we never send twice in a day.
    last_reminded_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "position", "-created_at"]
        indexes = [models.Index(fields=["user", "status", "position"])]

    def __str__(self):
        return f"{self.role} @ {self.company}"


class StatusChange(models.Model):
    """History of status moves, used for stats like "days from applied to reply"."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="history")
    from_status = models.CharField(max_length=20, choices=Application.Status.choices, blank=True)
    to_status = models.CharField(max_length=20, choices=Application.Status.choices)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]
