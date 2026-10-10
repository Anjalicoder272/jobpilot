from django.db import IntegrityError, transaction
from django.db.models import Count, Prefetch, Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from config.throttles import AIThrottle, SmartSearchThrottle

from matching.embeddings import cosine, embed_texts, embeddings_enabled

from .ai import extract_questions

from .models import Experience, Question, QuestionVote
from .serializers import ExperienceSerializer


MAX_SEARCH = 200
SMART_SEARCH_POOL = 2000


class ExperiencePagination(CursorPagination):
    """Cursor pagination: stable "load more" for infinite scroll, even while new posts arrive."""

    page_size = 8
    ordering = ("-created_at", "-id")


class ExperienceViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                        mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Public list of interview experiences.
    Filters: ?company=<slug>&level=SDE1&result=SELECTED&topic=REACT&search=debounce
    """

    serializer_class = ExperienceSerializer
    pagination_class = ExperiencePagination
    throttle_scope = None  # set to "ai" on the extract action (rate-limited AI calls)

    def get_throttles(self):
        if self.action == "list":
            return [AnonRateThrottle(), UserRateThrottle(), SmartSearchThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        # Anyone can read experiences; only logged-in users can share one.
        if self.action in ("list", "retrieve", "topics"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        params = self.request.query_params
        questions = Question.objects.annotate(vote_count=Count("votes"))
        qs = (Experience.objects.filter(is_published=True)
              .select_related("company", "user").prefetch_related(Prefetch("questions", queryset=questions)))
        if params.get("company"):
            qs = qs.filter(company__slug=params["company"])
        if params.get("level"):
            qs = qs.filter(level=params["level"])
        if params.get("result"):
            qs = qs.filter(result=params["result"])
        if params.get("topic"):
            qs = qs.filter(questions__topic=params["topic"])
        search = params.get("search", "").strip()[:MAX_SEARCH]
        if search:
            qs = qs.filter(Q(role__icontains=search) | Q(company__name__icontains=search)
                           | Q(summary__icontains=search) | Q(questions__text__icontains=search))
        return qs.distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        context["voted_ids"] = (set(QuestionVote.objects.filter(user=user).values_list("question_id", flat=True))
                                if user.is_authenticated else set())
        return context

    def list(self, request, *args, **kwargs):
        if request.query_params.get("smart") == "1" and request.query_params.get("search", "").strip():
            return self.smart_search(request)
        return super().list(request, *args, **kwargs)

    def smart_search(self, request):
        """Rank experiences by how close their questions are in *meaning* to the search text."""
        if not embeddings_enabled():
            return Response({"detail": "Smart search needs a Gemini key."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            query_vector = embed_texts([request.query_params["search"].strip()[:MAX_SEARCH]], task="RETRIEVAL_QUERY")[0]
        except Exception:
            return Response({"detail": "Smart search is unavailable right now. Try normal search."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        params = request.query_params.copy()
        params.pop("search")  # the meaning match replaces the keyword filter
        self.request._request.GET = params
        candidates = self.get_queryset()[:SMART_SEARCH_POOL]

        # Score every question, then keep only clear matches: close to the best one and well above average.
        rows = [(cosine(query_vector, q.embedding), q.id, exp)
                for exp in candidates for q in exp.questions.all() if q.embedding]
        if not rows:
            return Response({"next": None, "previous": None, "results": [], "smart": True, "matched_question_ids": []})
        scores = sorted(score for score, _, _ in rows)
        median, best = scores[len(scores) // 2], scores[-1]
        cutoff = min(best, max(best - 0.05, median + 0.05))  # the best match always counts

        best_per_exp, matched_ids = {}, []
        for score, qid, exp in rows:
            if score >= cutoff:
                matched_ids.append(qid)
                best_per_exp[exp.id] = max(best_per_exp.get(exp.id, (0, exp))[0], score), exp
        ranked = sorted(best_per_exp.values(), key=lambda pair: pair[0], reverse=True)[:24]
        data = self.get_serializer([exp for _, exp in ranked], many=True).data
        return Response({"next": None, "previous": None, "results": data, "smart": True,
                         "matched_question_ids": matched_ids})

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], throttle_classes=[AIThrottle], throttle_scope="ai")
    def extract(self, request):
        """Turn free-form interview notes into a list of tagged questions (nothing is saved)."""
        notes = str(request.data.get("notes", "")).strip()
        if len(notes) < 20:
            return Response({"detail": "Paste a few lines of your interview notes first."}, status=400)
        if len(notes) > 10_000:
            return Response({"detail": "Notes are too long. Paste up to 10,000 characters."}, status=400)
        return Response(extract_questions(notes))

    @action(detail=False, methods=["get"])
    def topics(self, request):
        """Most-asked topics, optionally for one company: /api/experiences/topics/?company=olx"""
        qs = Question.objects.filter(experience__is_published=True)
        if request.query_params.get("company"):
            qs = qs.filter(experience__company__slug=request.query_params["company"])
        labels = dict(Question.Topic.choices)
        rows = qs.values("topic").annotate(count=Count("id")).order_by("-count")
        return Response([{"topic": r["topic"], "label": labels[r["topic"]], "count": r["count"]} for r in rows])


class QuestionVoteView(viewsets.ViewSet):
    """POST /api/questions/<id>/vote/ toggles "I was asked this too" for the current user."""

    def vote(self, request, pk=None):
        question = Question.objects.filter(pk=pk, experience__is_published=True).first()
        if question is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        deleted, _ = QuestionVote.objects.filter(user=request.user, question=question).delete()
        created = False
        if not deleted:
            try:
                with transaction.atomic():
                    QuestionVote.objects.create(user=request.user, question=question)
                created = True
            except IntegrityError:  # a double click raced us; the vote exists, which is what was asked
                created = True
        return Response({"votes": question.votes.count(), "voted": created})
