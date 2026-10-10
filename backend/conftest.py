import pytest


@pytest.fixture(autouse=True)
def no_real_ai_calls(settings):
    """Tests never call a real AI provider, even if backend/.env has a key. Tests that need AI mock it."""
    settings.ANTHROPIC_API_KEY = ""
    settings.GEMINI_API_KEY = ""


@pytest.fixture(autouse=True)
def no_real_web_search(settings):
    """Tests never call Tavily for real either."""
    settings.TAVILY_API_KEY = ""
