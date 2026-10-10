"""
Create a demo user with sample data for local development:
    python manage.py seed_demo

All companies here are FICTIONAL, so no fake records are created about real companies.
"""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from applications.models import Application, Company, StatusChange
from experiences.models import Experience, Question

COMPANIES = ["Nimbus Labs", "Orbit Commerce", "PixelPay", "Crest Health", "Lumen AI", "Atlas Travel"]

QUESTIONS = [
    ("Implement a debounce function and explain where you would use it.", "JAVASCRIPT", "MEDIUM"),
    ("What is the difference between useMemo and useCallback?", "REACT", "EASY"),
    ("How would you cancel a stale fetch request when the user types quickly?", "JAVASCRIPT", "MEDIUM"),
    ("Explain the event loop with microtasks and macrotasks.", "JAVASCRIPT", "MEDIUM"),
    ("How does React reconciliation work, and why do keys matter?", "REACT", "MEDIUM"),
    ("SSR vs SSG vs ISR in Next.js: when would you use each?", "REACT", "MEDIUM"),
    ("How would you improve a page with a 4-second LCP?", "PERFORMANCE", "HARD"),
    ("What causes layout shift (CLS) and how do you fix it?", "PERFORMANCE", "MEDIUM"),
    ("Center a div in three different ways.", "CSS", "EASY"),
    ("Explain CSS specificity with an example.", "CSS", "EASY"),
    ("Design an infinite-scrolling feed with 10,000 items.", "SYSTEM_DESIGN", "HARD"),
    ("Design a rate limiter for a public API.", "SYSTEM_DESIGN", "HARD"),
    ("Find the longest substring without repeating characters.", "DSA", "MEDIUM"),
    ("Merge overlapping intervals.", "DSA", "MEDIUM"),
    ("Detect a cycle in a linked list.", "DSA", "EASY"),
    ("How does JWT authentication work, and where should the token be stored?", "BACKEND", "MEDIUM"),
    ("What is caching, and how would you invalidate a Redis cache?", "BACKEND", "MEDIUM"),
    ("Tell me about a production bug you fixed.", "BEHAVIORAL", "EASY"),
    ("Why do you want to leave your current company?", "BEHAVIORAL", "EASY"),
]

ROLES = ["Frontend Developer", "SDE-1 (Frontend)", "Full Stack Developer", "React Developer"]

SUMMARIES = [
    "Round 1 was an online test with two DSA questions. Round 2 focused on JavaScript fundamentals "
    "and a live coding task. Round 3 was with the engineering manager about past projects.",
    "A friendly process. The first call was with HR, then a 60-minute technical round on React and "
    "performance, followed by a machine-coding round where I built a searchable list.",
    "Three rounds in one day. They cared a lot about how I explain trade-offs, not just the answer. "
    "The final round was a light system design discussion.",
    "The take-home assignment was the main filter. In the follow-up call they asked me to walk through "
    "my code and make a small change live.",
]


class Command(BaseCommand):
    help = "Create a demo user and sample (fictional) data for local development."

    def handle(self, *args, **options):
        random.seed(7)
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username="demo@jobpilot.dev",
            defaults={"email": "demo@jobpilot.dev", "first_name": "Demo"},
        )
        if created:
            user.set_password("demo12345")
            user.save()

        companies = [Company.get_or_create_by_name(name) for name in COMPANIES]

        if not user.applications.exists():
            statuses = ["APPLIED", "APPLIED", "APPLIED", "HR_REPLIED", "HR_REPLIED", "INTERVIEW", "OFFER", "REJECTED"]
            today = timezone.localdate()
            for i, status in enumerate(statuses):
                app = Application.objects.create(
                    user=user, company=companies[i % len(companies)], role=ROLES[i % len(ROLES)],
                    location=random.choice(["Noida", "Gurugram", "Remote", "New Delhi"]),
                    status=status, position=i, applied_on=today - timedelta(days=i * 2),
                    follow_up_on=today - timedelta(days=1) if i == 0 else today + timedelta(days=3),
                    match_score=random.randint(55, 92),
                )
                StatusChange.objects.create(application=app, to_status=status)

        if not Experience.objects.exists():
            for i in range(30):
                exp = Experience.objects.create(
                    user=user, company=companies[i % len(companies)], role=random.choice(ROLES),
                    level=random.choice(["SDE1", "SDE1", "SDE2", "INTERN"]),
                    result=random.choice(["SELECTED", "REJECTED", "PENDING"]),
                    rounds=random.randint(2, 4), summary=random.choice(SUMMARIES),
                    interviewed_on=timezone.localdate() - timedelta(days=i * 3),
                )
                for text, topic, difficulty in random.sample(QUESTIONS, k=random.randint(3, 5)):
                    Question.objects.create(experience=exp, text=text, topic=topic, difficulty=difficulty)

        self.stdout.write(self.style.SUCCESS("Demo data ready. Log in with demo@jobpilot.dev / demo12345"))
