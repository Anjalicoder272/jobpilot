from django.utils import timezone
from rest_framework import serializers

from .models import Application, Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "slug"]


class ApplicationSerializer(serializers.ModelSerializer):
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
        extra_kwargs = {
            "role": {"max_length": 150},
            "jd_text": {"max_length": 20_000},
            "notes": {"max_length": 5_000},
            "job_url": {"max_length": 500},
        }

    def validate_company(self, value):
        value = Company.clean_name(value)
        if not any(ch.isalnum() for ch in value):
            raise serializers.ValidationError("Enter a company name.")
        return value

    def validate_role(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Enter a role.")
        return value

    def validate(self, data):
        applied = data.get("applied_on") or getattr(self.instance, "applied_on", None)
        follow_up = data.get("follow_up_on")
        if applied and follow_up and follow_up < applied:
            raise serializers.ValidationError({"follow_up_on": "Follow-up date can't be before the applied date."})
        return data

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
