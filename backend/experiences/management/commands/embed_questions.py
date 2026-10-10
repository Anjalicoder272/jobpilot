"""Compute smart-search embeddings for questions that don't have one yet:  python manage.py embed_questions"""
from django.core.management.base import BaseCommand

from experiences.models import Question
from matching.embeddings import embed_questions, embeddings_enabled


class Command(BaseCommand):
    help = "Backfill embeddings for smart search (needs GEMINI_API_KEY)."

    def handle(self, *args, **options):
        if not embeddings_enabled():
            self.stdout.write(self.style.WARNING("GEMINI_API_KEY is not set; nothing to do."))
            return
        pending = list(Question.objects.filter(embedding__isnull=True, experience__is_published=True))
        done = 0
        # Small chunks, saved as we go, so a rate-limit error never loses finished work.
        for start in range(0, len(pending), 20):
            try:
                done += embed_questions(pending[start:start + 20])
            except Exception as error:
                self.stdout.write(self.style.WARNING(f"Stopped after {done}: {error}. Run the command again later."))
                break
            self.stdout.write(f"  {done}/{len(pending)}")
        self.stdout.write(self.style.SUCCESS(f"Embedded {done} question(s)."))
