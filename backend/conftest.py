import pytest
from rest_framework.test import APIClient



@pytest.fixture(autouse=True)
def no_real_ai_calls(settings):
    """Tests never call a real AI provider, even if backend/.env has a key. Tests that need AI mock it."""
    settings.ANTHROPIC_API_KEY = ""
    settings.GEMINI_API_KEY = ""


@pytest.fixture(autouse=True)
def no_real_web_search(settings):
    """Tests never call Tavily for real either."""
    settings.TAVILY_API_KEY = ""


@pytest.fixture(autouse=True)
def api_csrf_header(monkeypatch):
    """The real frontend sends this header on every request (see config/middleware.py)."""
    original = APIClient.__init__

    def init(self, *args, **kwargs):
        kwargs.setdefault("HTTP_X_REQUESTED_WITH", "JobPilot")
        original(self, *args, **kwargs)

    monkeypatch.setattr(APIClient, "__init__", init)


@pytest.fixture(autouse=True)
def fresh_throttles():
    from django.core.cache import cache
    cache.clear()
