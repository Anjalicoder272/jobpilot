from django.contrib import admin

from .models import Application, Company, StatusChange


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    search_fields = ["name"]


class StatusChangeInline(admin.TabularInline):
    model = StatusChange
    extra = 0
    readonly_fields = ["from_status", "to_status", "changed_at"]


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["role", "company", "user", "status", "applied_on"]
    list_filter = ["status"]
    search_fields = ["role", "company__name"]
    inlines = [StatusChangeInline]
