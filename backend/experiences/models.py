from django.conf import settings
from django.db import models

from applications.models import Company


class Experience(models.Model):
    class Level(models.TextChoices):
        INTERN = "INTERN", "Intern"
        SDE1 = "SDE1", "SDE-1"
        SDE2 = "SDE2", "SDE-2"
        SENIOR = "SENIOR", "Senior"

    class Result(models.TextChoices):
        SELECTED = "SELECTED", "Selected"
        REJECTED = "REJECTED", "Rejected"
        PENDING = "PENDING", "Result pending"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="experiences")
    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="experiences")
    role = models.CharField(max_length=150)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.SDE1)
    result = models.CharField(max_length=10, choices=Result.choices, default=Result.PENDING)
    rounds = models.PositiveSmallIntegerField(default=1)
    summary = models.TextField(help_text="How the process went, round by round.")
    interviewed_on = models.DateField(null=True, blank=True)
    # Set by moderation when a post is created. Flagged posts wait for an admin in Django Admin.
    is_published = models.BooleanField(default=True)
    moderation_note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.company} – {self.role}"


class Question(models.Model):
    class Topic(models.TextChoices):
        JAVASCRIPT = "JAVASCRIPT", "JavaScript"
        REACT = "REACT", "React"
        CSS = "CSS", "HTML & CSS"
        PERFORMANCE = "PERFORMANCE", "Web performance"
        DSA = "DSA", "DSA"
        SYSTEM_DESIGN = "SYSTEM_DESIGN", "System design"
        BACKEND = "BACKEND", "Backend & APIs"
        BEHAVIORAL = "BEHAVIORAL", "Behavioral"
        OTHER = "OTHER", "Other"

    class Difficulty(models.TextChoices):
        EASY = "EASY", "Easy"
        MEDIUM = "MEDIUM", "Medium"
        HARD = "HARD", "Hard"

    experience = models.ForeignKey(Experience, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    topic = models.CharField(max_length=20, choices=Topic.choices, default=Topic.OTHER)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    # "Meaning vector" for smart search (see matching/embeddings.py). Empty until computed.
    embedding = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.text[:60]


class QuestionVote(models.Model):
    """ "I was asked this too": one vote per user per question."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="question_votes")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="votes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "question"], name="one_vote_per_user")]
