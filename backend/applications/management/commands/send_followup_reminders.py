"""
Email each user a short digest of applications that are due for a follow-up.

    python manage.py send_followup_reminders

Run it once a day (for example with cron). Locally, emails are printed in the terminal.
"""
from collections import defaultdict

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from applications.models import Application


class Command(BaseCommand):
    help = "Send follow-up reminder emails for applications that haven't had a reply."

    def handle(self, *args, **options):
        today = timezone.localdate()
        due = (
            Application.objects.filter(
                status__in=[Application.Status.APPLIED, Application.Status.HR_REPLIED],
                follow_up_on__lte=today,
            )
            .exclude(last_reminded_on=today)  # never remind twice on the same day
            .select_related("user", "company")
        )

        by_user = defaultdict(list)
        for app in due:
            by_user[app.user].append(app)

        for user, apps in by_user.items():
            lines = []
            for app in apps:
                days = (today - app.applied_on).days
                contact = f" · HR: {app.hr_name or app.hr_email}" if (app.hr_name or app.hr_email) else ""
                lines.append(f"- {app.role} at {app.company} (applied {days} days ago){contact}")
            body = (
                f"Hi {user.first_name or 'there'},\n\n"
                f"These applications are due for a follow-up:\n\n" + "\n".join(lines) +
                "\n\nA short, polite follow-up often gets a reply. Open your board to update them.\n\n– JobPilot"
            )
            send_mail(
                subject=f"{len(apps)} application{'s' if len(apps) > 1 else ''} to follow up today",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
            Application.objects.filter(pk__in=[a.pk for a in apps]).update(last_reminded_on=today)

        self.stdout.write(self.style.SUCCESS(f"Sent reminders to {len(by_user)} user(s)."))
