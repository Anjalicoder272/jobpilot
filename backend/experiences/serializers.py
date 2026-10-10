from django.db import transaction
from rest_framework import serializers

from applications.models import Company

from .ai import moderate, redact_personal_info
from .models import Experience, Question

MAX_QUESTIONS = 30


class QuestionSerializer(serializers.ModelSerializer):
    topic_label = serializers.CharField(source="get_topic_display", read_only=True)
    votes = serializers.SerializerMethodField()
    voted = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ["id", "text", "topic", "topic_label", "difficulty", "votes", "voted"]
        read_only_fields = ["votes", "voted"]
        extra_kwargs = {"text": {"max_length": 500}}

    def validate_text(self, value):
        value = " ".join(value.split())
        if len(value) < 5:
            raise serializers.ValidationError("Write the full question.")
        return value

    def get_votes(self, obj):
        # Annotated in the view's queryset; newly created questions have 0.
        return getattr(obj, "vote_count", 0)

    def get_voted(self, obj):
        return obj.id in self.context.get("voted_ids", set())


class ExperienceSerializer(serializers.ModelSerializer):
    company = serializers.CharField(source="company.name", max_length=120)
    company_slug = serializers.CharField(source="company.slug", read_only=True)
    level_label = serializers.CharField(source="get_level_display", read_only=True)
    result_label = serializers.CharField(source="get_result_display", read_only=True)
    author = serializers.SerializerMethodField()
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Experience
        fields = [
            "id", "company", "company_slug", "role", "level", "level_label", "result",
            "result_label", "rounds", "summary", "interviewed_on", "author", "questions", "created_at",
            "is_published", "moderation_note",
        ]
        read_only_fields = ["is_published", "moderation_note"]
        extra_kwargs = {
            "role": {"max_length": 150},
            "summary": {"max_length": 10_000},
            "rounds": {"min_value": 1, "max_value": 20},
        }

    def get_author(self, obj):
        # first_name holds the full name typed at signup; only the first word is ever public.
        return (obj.user.first_name.split() or ["Anonymous"])[0]

    def validate_company(self, value):
        value = Company.clean_name(value)
        if not any(ch.isalnum() for ch in value):
            raise serializers.ValidationError("Enter a company name.")
        return value

    def validate_questions(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one question you were asked.")
        if len(value) > MAX_QUESTIONS:
            raise serializers.ValidationError(f"Add at most {MAX_QUESTIONS} questions.")
        seen, unique = set(), []
        for q in value:
            if q["text"].lower() not in seen:
                seen.add(q["text"].lower())
                unique.append(q)
        return unique

    @transaction.atomic
    def create(self, validated_data):
        questions = validated_data.pop("questions")
        company = Company.get_or_create_by_name(validated_data.pop("company")["name"])
        # Privacy: strip emails and phone numbers before anything is saved.
        validated_data["summary"] = redact_personal_info(validated_data["summary"])
        for q in questions:
            q["text"] = redact_personal_info(q["text"])
        # Moderation: flagged posts are saved but stay hidden until an admin approves them.
        verdict = moderate(company.name, validated_data["role"], validated_data["summary"], [q["text"] for q in questions])
        validated_data["is_published"] = verdict["ok"]
        validated_data["moderation_note"] = verdict["reason"]
        experience = Experience.objects.create(company=company, **validated_data)
        created = Question.objects.bulk_create([Question(experience=experience, **q) for q in questions])
        if experience.is_published:
            try:  # best effort: smart search still works for other questions if this fails
                from matching.embeddings import embed_questions
                embed_questions(created)
            except Exception:
                pass
        return experience
