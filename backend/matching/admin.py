from django.contrib import admin

from .models import CompanyInsight


@admin.register(CompanyInsight)
class CompanyInsightAdmin(admin.ModelAdmin):
    list_display = ["company", "role", "mode", "created_at"]
    search_fields = ["company", "role"]
