from django.db import transaction
from django.db.models import Count, F
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Application, Company, StatusChange
from .serializers import ApplicationSerializer, CompanySerializer, MoveSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD for the current user's job applications, plus Kanban moves."""

    serializer_class = ApplicationSerializer

    def get_queryset(self):
        # Users only ever see their own applications.
        return Application.objects.filter(user=self.request.user).select_related("company")

    @transaction.atomic
    def perform_create(self, serializer):
        # New cards go to the top of the "Applied" column.
        self.get_queryset().filter(status=Application.Status.APPLIED).update(position=F("position") + 1)
        app = serializer.save(user=self.request.user, status=Application.Status.APPLIED, position=0)
        StatusChange.objects.create(application=app, to_status=app.status)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def move(self, request, pk=None):
        """Move a card to a column (status) at a given index, and renumber the column."""
        app = self.get_object()
        data = MoveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        new_status, index = data.validated_data["status"], data.validated_data["index"]

        old_status = app.status
        column = list(self.get_queryset().filter(status=new_status).exclude(pk=app.pk).order_by("position"))
        column.insert(min(index, len(column)), app)
        app.status = new_status
        for position, card in enumerate(column):
            card.position = position
        Application.objects.bulk_update(column, ["status", "position"])

        if old_status != new_status:
            StatusChange.objects.create(application=app, from_status=old_status, to_status=new_status)
        return Response(self.get_serializer(app).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        counts = dict(self.get_queryset().values_list("status").annotate(n=Count("id")))
        return Response({status: counts.get(status, 0) for status in Application.Status.values})


class CompanyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Company names for autocomplete: /api/companies/?search=ol"""

    serializer_class = CompanySerializer

    def get_queryset(self):
        qs = Company.objects.all()
        search = self.request.query_params.get("search", "").strip()
        return qs.filter(name__icontains=search)[:10] if search else qs[:10]

