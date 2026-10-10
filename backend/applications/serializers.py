from django.utils import timezone
from rest_framework import serializers

from .models import Application, Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "slug"]


class ApplicationSerializer(serializers.ModelSerializer):
    # Clients send the company as plain text ("OLX"); we find or create it.
    company = serializers.CharField(source="company.name", max_length=120)
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    is_follow_up_due = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id", "company", "company_slug", "role", "location", "job_url", "jd_text",
            "status", "position", "hr_name", "hr_email", "notes", "applied_on",
            "follow_up_on", "is_follow_up_due", "match_score", "matched_skills", "missing_skills",
            "match_summary", "match_source", "created_at", "updated_at",
        ]
        read_only_fields = [
            "status", "position", "match_score", "matched_skills", "missing_skills",
            "match_summary", "match_source", "created_at", "updated_at",
        ]

    def get_is_follow_up_due(self, obj):
        waiting = obj.status in (Application.Status.APPLIED, Application.Status.HR_REPLIED)
        return bool(waiting and obj.follow_up_on and obj.follow_up_on <= timezone.localdate())

    def _company(self, validated_data):
        name = validated_data.pop("company", {}).get("name")
        return Company.get_or_create_by_name(name) if name else None

    def create(self, validated_data):
        validated_data["company"] = self._company(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        company = self._company(validated_data)
        if company:
            validated_data["company"] = company
        return super().update(instance, validated_data)


class MoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.Status.choices)
    index = serializers.IntegerField(min_value=0)
