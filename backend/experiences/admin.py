from django.contrib import admin

from .models import Experience, Question


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ["company", "role", "level", "result", "is_published", "created_at"]
    list_filter = ["is_published", "level", "result"]
    list_editable = ["is_published"]
    search_fields = ["company__name", "role", "summary"]
    inlines = [QuestionInline]
